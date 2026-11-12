'use strict';

/* =========================================================
   战斗参数(连击数值全部数据驱动,见 data.js WEAPON_DEFS)
   ========================================================= */
const ROLL_DUR = 0.3;

/* =========================================================
   玩家
   ========================================================= */
class Player {
  constructor(meta) {
    this.meta = meta || {};
    const up = this.meta.up || {};
    this.w = 44;
    this.h = 76;
    this.hpMax = 100 + 20 * (up.hp || 0);
    this.hp = this.hpMax;
    this.power = 1 + 0.1 * (up.power || 0);
    this.potionsMax = 2 + (up.potion || 0);
    this.potions = this.potionsMax;
    /* 二段跳默认解锁;轻盈之靴额外提供第三段跳 */
    this.hasDoubleJump = true;
    this.maxJumps = 2 + (up.agility ? 1 : 0);
    this.dead = false;

    /* 装备槽(数据驱动,物品实例见 items.js) */
    this.gear = {
      weaponA: makeItem('balanced', 'weapon', 1, RARITY[0]),
      weaponB: null,
      shield: makeItem('woodshield', 'shield', 1, RARITY[0]),
      skill1: makeItem('knife', 'skill', 1, RARITY[0]),
      skill2: makeItem('grenade', 'skill', 1, RARITY[0]),
      amulet: null
    };
    this.activeSlot = 'weaponA'; // 当前主手槽位(Q 切换)
    /* 三色属性卷轴:暴虐 / 战术 / 生存 */
    this.scrolls = { brutality: 0, tactics: 0, survival: 0 };
    /* 变异:每区三选一,最多 3 个,死亡清零 */
    this.mutations = [];
    this.refreshGearStats();

    /* 技能槽运行时状态(冷却/充能) */
    this.skillState = {};
    this.resetSkillState('skill1');
    this.resetSkillState('skill2');

    this.x = 140;
    this.y = GROUND_Y;
    this.resetAt(140, GROUND_Y);
  }

  resetAt(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.groundPlatform = null;
    this.state = 'idle';
    this.animT = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumps = 0;
    this.rollT = 0;
    this.rollCd = 0;
    this.rollDir = 1;
    this.rollCrit = 0;
    this.attackT = 0;
    this.attackIndex = 0;
    this.attackCombo = this.currentCombo() || WEAPON_MAP.balanced.combo;
    this.attackCfg = this.attackCombo[0];
    this.attackHit = false;
    this.attackBuffer = 0;
    this.rollBuffer = 0;
    this.skill1Buffer = 0;
    this.skill2Buffer = 0;
    this.swapBuffer = 0;
    this.pickupBuffer = 0;
    this.potionBuffer = 0;
    this.comboTimer = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.blockHeld = false; // 举盾(L 长按)
    this.blockT = 0;        // 举盾持续时间(完美格挡窗口判定)
    this.parryCrit = 0;     // 完美格挡后的暴击窗口
    this.potionCd = 0;
    this.rangedRegen = 0;   // 远程武器装填计时
    this.attackAngle = -0.5;
    this.trail = [];
    this.afterimages = [];
    this.emberT = 0;
    this.lastSafe = { x, y };
    this.dead = false;
    this.capePts = null;
    this.initCape();
  }

  /* ---------- 装备查询 ---------- */
  weaponItem() {
    return (this.gear && this.gear[this.activeSlot]) || null;
  }

  weaponDef() {
    const item = this.weaponItem();
    return (item && WEAPON_MAP[item.defId]) || WEAPON_MAP.balanced;
  }

  /* 当前主手近战 combo;远程武器返回 null(阶段2 处理远程) */
  currentCombo() {
    const def = this.weaponDef();
    return def && def.kind === 'melee' ? def.combo : null;
  }

  /* ---------- 派生属性重算(装备/词缀/护符变更后调用) ---------- */
  refreshGearStats() {
    const up = (this.meta && this.meta.up) || {};
    const bonus = gearBonus(this);
    const hpRatio = this.hpMax > 0 ? this.hp / this.hpMax : 1;
    const survivalLv = (this.scrolls && this.scrolls.survival) || 0;
    /* 生存属性:每级最大生命 +12% */
    const survivalHp = 1 + 0.12 * survivalLv;
    /* 变异:壁垒 +30 最大生命 */
    const hasBulwark = this.hasMutation && this.hasMutation('bulwark');
    this.hpMax = Math.round(((100 + 20 * (up.hp || 0) + bonus.hp) * (1 + (bonus.hpMul || 0)) + (hasBulwark ? 30 : 0)) * survivalHp);
    this.hp = clamp(hpRatio * this.hpMax, 0, this.hpMax);
    this.power = (1 + 0.1 * (up.power || 0)) * (1 + bonus.dmg);
    this.critBonus = bonus.crit;   // 额外暴击率(小数)
    this.speedBonus = bonus.speed; // 移速加成(小数)
    this.greedBonus = bonus.greed; // 金币获取加成
    this.cellsBonus = bonus.cells; // 细胞获取加成
    this.cdBonus = bonus.cd;       // 技能冷却缩减
    this.knockBonus = bonus.knock; // 击退增强
  }

  /* ---------- 变异 ---------- */
  hasMutation(id) {
    return !!(this.mutations && this.mutations.includes(id));
  }

  addMutation(id) {
    if (!this.mutations) this.mutations = [];
    if (this.mutations.length >= 3 || this.mutations.includes(id)) return false;
    this.mutations.push(id);
    this.refreshGearStats();
    this.hp = Math.min(this.hpMax, this.hp);
    return true;
  }

  /* ---------- 卷轴属性加成 ---------- */
  addScroll(statId) {
    if (!this.scrolls) this.scrolls = { brutality: 0, tactics: 0, survival: 0 };
    this.scrolls[statId] = (this.scrolls[statId] || 0) + 1;
    this.refreshGearStats();
  }

  /* 武器吃对应属性的伤害倍率 */
  statMul(def) {
    if (!def || !def.stat || !this.scrolls) return 1;
    return 1 + 0.15 * (this.scrolls[def.stat] || 0);
  }

  /* ---------- 技能槽状态重置(换装时调用,由 SKILL_DEFS 驱动) ---------- */
  resetSkillState(slot) {
    const item = this.gear && this.gear[slot];
    const def = item ? SKILL_MAP[item.defId] : null;
    if (!this.skillState) this.skillState = {};
    this.skillState[slot] = {
      cd: 0,
      ammo: def && def.charges ? def.charges : 0,
      regenT: 0
    };
  }

  /* ---------- Q 切换主副武器 ---------- */
  switchWeapon(game) {
    if (!this.gear || !this.gear.weaponB || this.rollT > 0) return;
    this.activeSlot = this.activeSlot === 'weaponA' ? 'weaponB' : 'weaponA';
    this.onWeaponChanged();
    sfx.play('swap');
    if (game) {
      const item = this.weaponItem();
      game.addText(this.x, this.y - 100, item ? itemName(item) : '', '#bfe8ef', 13, false);
    }
  }

  /* 主手武器变更后重置攻击状态(切换/换装) */
  onWeaponChanged() {
    this.attackIndex = 0;
    this.attackT = 0;
    this.trail.length = 0;
    this.attackCombo = this.currentCombo() || this.attackCombo;
    this.rangedRegen = 0;
    const item = this.weaponItem();
    const def = this.weaponDef();
    if (item && def.kind === 'ranged' && item.ammo === undefined) item.ammo = def.ammo;
  }

  /* 空中下劈配置:由当前武器第一段连击派生 */
  airStrikeCfg() {
    const combo = this.currentCombo() || WEAPON_MAP.balanced.combo;
    const base = combo[0];
    return {
      dur: 0.3, active: 0.08,
      damage: Math.round(base.damage * 1.2),
      range: 88, height: 108,
      angleFrom: 0.9, angleTo: 2.3,
      lunge: 0, air: true
    };
  }

  /* ---------- 使用技能(U / I) ---------- */
  useSkill(slot, game) {
    if (this.dead || this.rollT > 0) return;
    const item = this.gear && this.gear[slot];
    if (!item) return;
    const def = SKILL_MAP[item.defId];
    const st = this.skillState[slot];
    if (!def || !st || st.cd > 0) return;
    const dmgMul = this.power * itemDamageMul(item);
    const cdMul = 1 - (this.cdBonus || 0);

    switch (def.kind) {
      case 'proj': { // 飞刀
        if (st.ammo <= 0) return;
        st.ammo--;
        st.cd = def.cd * cdMul;
        game.spawnProj(this.x + this.facing * 22, this.y - 48, this.facing * 980, 0, def.damage * dmgMul, { kind: 'knife', life: 0.95 });
        sfx.play('throw');
        break;
      }
      case 'bomb': { // 手雷
        st.cd = def.cd * cdMul;
        game.spawnBomb(this.x + this.facing * 16, this.y - 62, this.facing * 420, -430, 0.9, def.radius, def.damage * dmgMul, 'player');
        sfx.play('throw');
        break;
      }
      case 'nova': { // 冰霜新星:冻结周围
        st.cd = def.cd * cdMul;
        for (const e of game.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - this.x, (e.y - e.h / 2) - (this.y - 40));
          if (d < def.radius) {
            e.stun = Math.max(e.stun, def.freeze);
            e.slowT = Math.max(e.slowT || 0, def.freeze + 1.2);
            game.damageEnemy(e, def.damage * dmgMul, this.x, false, { knock: 60, ignoreBlock: true });
          }
        }
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * TAU;
          game.emit({
            x: this.x + Math.cos(a) * 26, y: this.y - 40 + Math.sin(a) * 18,
            vx: Math.cos(a) * rand(240, 420), vy: Math.sin(a) * rand(160, 300),
            life: rand(0.3, 0.6), size: rand(1.6, 3.4),
            color: 'rgba(160,225,255,0.9)', glow: true, gravity: -30, drag: 2
          });
        }
        game.addShake(5);
        sfx.play('nova');
        break;
      }
      case 'turret': { // 弩箭塔
        st.cd = def.cd * cdMul;
        game.turrets.push({
          x: this.x + this.facing * 34,
          y: this.y,
          t: def.dur,
          cd: 0.3,
          damage: def.damage * dmgMul,
          range: def.range,
          facing: this.facing
        });
        sfx.play('equip');
        break;
      }
      case 'smoke': { // 烟雾弹:敌人丢失目标
        st.cd = def.cd * cdMul;
        game.smokeT = def.dur;
        for (let i = 0; i < 22; i++) {
          game.emit({
            x: this.x + rand(-30, 30), y: this.y - rand(6, 70),
            vx: rand(-60, 60), vy: rand(-60, -10),
            life: rand(0.6, 1.4), size: rand(6, 16),
            color: 'rgba(140,160,165,0.4)', gravity: -30, drag: 1.6, type: 'smoke'
          });
        }
        sfx.play('roll');
        break;
      }
      case 'thunder': { // 落雷:轰击前方区域
        st.cd = def.cd * cdMul;
        const cx = this.x + this.facing * 130;
        for (const e of game.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - cx, (e.y - e.h / 2) - (this.y - 40));
          if (d < def.radius + e.w * 0.4) {
            game.damageEnemy(e, def.damage * dmgMul, cx, false, { knock: 200, ignoreBlock: true });
            e.stun = Math.max(e.stun, 0.5);
          }
        }
        for (let i = 0; i < 20; i++) {
          game.emit({
            x: cx + rand(-40, 40), y: this.y - rand(0, 260),
            vx: rand(-30, 30), vy: rand(300, 700),
            life: rand(0.12, 0.3), size: rand(1.6, 3.6),
            color: 'rgba(200,235,255,0.95)', glow: true, type: 'spark'
          });
        }
        game.addShake(8);
        game.hitStop = Math.max(game.hitStop, 0.04);
        sfx.play('thunder');
        break;
      }
      case 'heal': { // 治疗术
        if (this.hp >= this.hpMax) return;
        st.cd = def.cd * cdMul;
        const amount = def.heal;
        this.hp = Math.min(this.hpMax, this.hp + amount);
        game.addText(this.x, this.y - 92, '+' + amount, '#7cf0c8', 20, false);
        sfx.play('heal');
        break;
      }
      case 'hook': { // 钩爪:拉近最近敌人
        st.cd = def.cd * cdMul;
        let target = null;
        let bd = def.range;
        for (const e of game.enemies) {
          if (e.dead || e.type === 'boss') continue;
          const dx = e.x - this.x;
          if (signOf(dx) !== this.facing) continue;
          const d = Math.abs(dx);
          if (d < bd) { bd = d; target = e; }
        }
        if (target) {
          target.x = this.x + this.facing * 64;
          target.vx = 0;
          target.stun = Math.max(target.stun, def.stun);
          game.damageEnemy(target, def.damage * dmgMul, this.x, false, { knock: 0, ignoreBlock: true });
          game.addText(target.x, target.y - target.h - 8, '钩锁', '#ffd9a0', 14, false);
        }
        for (let i = 0; i < 8; i++) { // 钩链残影
          game.emit({
            x: this.x + this.facing * (20 + i * (bd / 8)),
            y: this.y - 44,
            vx: 0, vy: 0,
            life: 0.18, size: 2.4,
            color: 'rgba(230,200,140,0.85)', glow: true
          });
        }
        sfx.play('dash');
        break;
      }
      default:
        break;
    }
  }

  initCape() {
    const ax = this.x - this.facing * 8;
    const ay = this.y - 66;
    this.capePts = [];
    for (let i = 0; i < 10; i++) {
      this.capePts.push({
        x: ax - this.facing * i * 7,
        y: ay + i * 3,
        vx: 0,
        vy: 0
      });
    }
  }

  updateCape(dt, game) {
    const pts = this.capePts;
    if (!pts) return;
    const anchorX = this.x - this.facing * 7;
    const anchorY = this.y - 66 + (this.rollT > 0 ? 8 : 0);
    pts[0].x = anchorX;
    pts[0].y = anchorY;

    const wind = Math.sin(game.time * 2.3) * 42 + Math.sin(game.time * 5.9) * 16;

    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      p.vx += (-this.facing * 190 - this.vx * 0.8 + wind) * dt;
      p.vy += (900 + Math.abs(this.vx) * 0.35) * dt;
      p.vx *= 0.965;
      p.vy *= 0.965;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > this.y - 3) {
        p.y = this.y - 3;
        p.vy *= -0.15;
      }
    }

    const seg = 8.5;
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const diff = (d - seg) / d;
        b.x -= dx * diff * 0.55;
        b.y -= dy * diff * 0.55;
        a.x += dx * diff * 0.45;
        a.y += dy * diff * 0.45;
      }
    }
  }

  update(dt, game) {
    this.animT += dt;
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.attackBuffer = Math.max(0, this.attackBuffer - dt);
    this.rollBuffer = Math.max(0, this.rollBuffer - dt);
    this.skill1Buffer = Math.max(0, this.skill1Buffer - dt);
    this.skill2Buffer = Math.max(0, this.skill2Buffer - dt);
    this.swapBuffer = Math.max(0, this.swapBuffer - dt);
    this.pickupBuffer = Math.max(0, this.pickupBuffer - dt);
    this.potionBuffer = Math.max(0, this.potionBuffer - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.rollCd = Math.max(0, this.rollCd - dt);
    this.rollCrit = Math.max(0, this.rollCrit - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.potionCd = Math.max(0, this.potionCd - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    this.parryCrit = Math.max(0, this.parryCrit - dt);
    this.blockT = this.blockHeld ? this.blockT + dt : 0;

    /* 技能冷却与充能回复(SKILL_DEFS 驱动) */
    for (const slot of ['skill1', 'skill2']) {
      const st = this.skillState && this.skillState[slot];
      const item = this.gear && this.gear[slot];
      const def = item ? SKILL_MAP[item.defId] : null;
      if (!st || !def) continue;
      st.cd = Math.max(0, st.cd - dt);
      if (def.regen && st.ammo < (def.charges || 0)) {
        st.regenT += dt;
        if (st.regenT >= def.regen) {
          st.regenT = 0;
          st.ammo++;
        }
      }
    }

    /* 远程武器装填回复 */
    {
      const def = this.weaponDef();
      if (def.kind === 'ranged') {
        const item = this.weaponItem();
        if (item.ammo === undefined) item.ammo = def.ammo;
        if (item.ammo < def.ammo) {
          this.rangedRegen += dt;
          if (this.rangedRegen >= def.regen) {
            this.rangedRegen = 0;
            item.ammo++;
          }
        } else {
          this.rangedRegen = 0;
        }
      }
    }

    this.afterimages = this.afterimages.filter((a) => {
      a.t -= dt;
      return a.t > 0;
    });

    if (this.comboTimer <= 0 && this.attackT <= 0) this.attackIndex = 0;

    if (this.dead) return;

    const K = game.keys;

    /* 举盾(L 长按):翻滚/受击时无法举盾 */
    this.blockHeld = !!K['KeyL'] && this.rollT <= 0 && this.hurtT <= 0;

    /* Q 切换主副武器 */
    if (this.swapBuffer > 0) {
      this.swapBuffer = 0;
      this.switchWeapon(game);
    }

    /* E 拾取地面装备/图纸 */
    if (this.pickupBuffer > 0) {
      this.pickupBuffer = 0;
      if (game.tryPickup) game.tryPickup();
    }

    let dir = 0;
    if (K['KeyA'] || K['ArrowLeft']) dir -= 1;
    if (K['KeyD'] || K['ArrowRight']) dir += 1;

    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);

    /* ---- 翻滚 ---- */
    if (this.rollT > 0) {
      this.rollT -= dt;
      const k = Math.max(0, this.rollT / ROLL_DUR);
      this.vx = this.rollDir * (680 * (0.45 + 0.55 * k));
      if (this.rollT <= 0) {
        this.rollT = 0;
        this.rollCd = 0.12;
        this.vx *= 0.35;
      }
      if (Math.random() < 0.55) {
        this.afterimages.push({
          x: this.x,
          y: this.y,
          facing: this.facing,
          t: 0.22
        });
      }
      if (Math.random() < 0.5) {
        game.emit({
          x: this.x + rand(-12, 12),
          y: this.y - rand(2, 12),
          vx: rand(-30, 30),
          vy: rand(-70, -20),
          life: rand(0.25, 0.45),
          size: rand(3, 8),
          color: 'rgba(160,190,180,0.5)',
          gravity: -20,
          type: 'smoke'
        });
      }
    } else if (this.hurtT > 0) {
      this.vx = approach(this.vx, 0, 900 * dt);
    } else {
      const control = this.attackT > 0 ? 0.4 : 1;
      const maxSpeed = 312 * control * (this.blockHeld ? 0.35 : 1) * (1 + (this.speedBonus || 0)) * (this.hasMutation('swift') ? 1.15 : 1);
      const accel = this.onGround ? 2800 : 1700;
      if (dir !== 0) {
        this.vx = approach(this.vx, dir * maxSpeed, accel * dt);
        this.facing = dir;
      } else {
        this.vx = approach(this.vx, 0, (this.onGround ? 2500 : 500) * dt);
      }

      /* 跳跃 */
      if (this.jumpBuffer > 0) {
        if (this.onGround || this.coyote > 0) {
          this.vy = -830;
          this.jumps = 1;
          this.onGround = false;
          this.coyote = 0;
          this.jumpBuffer = 0;
          sfx.play('jump');
          for (let i = 0; i < 6; i++) {
            game.emit({
              x: this.x + rand(-10, 10),
              y: this.y,
              vx: rand(-80, 80),
              vy: rand(-40, 10),
              life: rand(0.25, 0.5),
              size: rand(3, 7),
              color: 'rgba(170,205,195,0.4)',
              gravity: -30,
              type: 'smoke'
            });
          }
        } else if (this.hasDoubleJump && this.jumps < this.maxJumps) {
          /* 第二段 -720(保持原手感);轻盈之靴的第三段稍弱 */
          this.vy = this.jumps === 1 ? -720 : -620;
          this.jumps++;
          this.jumpBuffer = 0;
          sfx.play('doubleJump');
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            game.emit({
              x: this.x + Math.cos(a) * 16,
              y: this.y - 30 + Math.sin(a) * 10,
              vx: Math.cos(a) * 140,
              vy: Math.sin(a) * 60 + 20,
              life: 0.35,
              size: 3,
              color: 'rgba(120,240,240,0.8)',
              glow: true,
              drag: 3
            });
          }
        }
      }

      const jumpHeld = K['Space'] || K['KeyW'] || K['ArrowUp'];
      /* 地面起跳保留可变跳高(松手切断);空中二段跳固定高度 */
      if (!jumpHeld && this.vy < -300 && this.jumps <= 1) this.vy = -300;

      /* 翻滚 */
      if (this.rollBuffer > 0 && this.rollCd <= 0 && this.onGround && this.rollT <= 0) {
        this.rollT = ROLL_DUR;
        this.rollCd = 0.16 * (this.hasMutation('acrobat') ? 0.65 : 1);
        this.rollCrit = 0.9; // 翻滚后必暴窗口
        this.rollDir = dir !== 0 ? dir : this.facing;
        this.facing = this.rollDir;
        this.rollBuffer = 0;
        this.attackT = 0;
        this.attackHit = true;
        this.trail = [];
        sfx.play('roll');
        game.addShake(2.5);
      }

      /* 攻击:近战连击 / 远程射击 / 空中下劈 */
      if (this.attackBuffer > 0 && this.attackT <= 0 && this.rollT <= 0) {
        const def = this.weaponDef();
        if (def.kind === 'ranged') {
          const item = this.weaponItem();
          if (item.ammo === undefined) item.ammo = def.ammo;
          if (item.ammo > 0) {
            item.ammo--;
            this.attackCfg = {
              dur: def.attackDur || 0.36, active: 0.05,
              damage: 0, range: 0, height: 0,
              angleFrom: -1.35, angleTo: -1.35, lunge: 0, ranged: true
            };
            this.attackT = this.attackCfg.dur;
            this.attackHit = false;
            this.attackBuffer = 0;
            this.trail = [];
            this.vx -= this.facing * 36;
            sfx.play('throw');
          } else {
            this.attackBuffer = 0;
          }
        } else if (!this.onGround) {
          /* 空中下劈:俯冲斩,落地取消后摇 */
          const cfg = this.airStrikeCfg();
          this.attackCombo = this.currentCombo() || WEAPON_MAP.balanced.combo;
          this.attackCfg = cfg;
          this.attackT = cfg.dur;
          this.attackHit = false;
          this.attackBuffer = 0;
          this.comboTimer = cfg.dur + 0.5;
          this.trail = [];
          this.vy = Math.max(this.vy, 620);
          this.vx = this.facing * 120;
          sfx.play('slash');
        } else {
          const combo = this.currentCombo() || WEAPON_MAP.balanced.combo;
          this.attackCombo = combo;
          const cfg = combo[this.attackIndex % combo.length];
          this.attackCfg = cfg;
          this.attackT = cfg.dur;
          this.attackHit = false;
          this.attackBuffer = 0;
          this.comboTimer = cfg.dur + 0.5;
          this.trail = [];
          this.vx += this.facing * cfg.lunge;
          sfx.play('slash');
        }
      }

      /* 技能1(U) / 技能2(I) */
      if (this.skill1Buffer > 0) {
        this.skill1Buffer = 0;
        this.useSkill('skill1', game);
      }
      if (this.skill2Buffer > 0) {
        this.skill2Buffer = 0;
        this.useSkill('skill2', game);
      }

      /* 药水 */
      if (this.potionBuffer > 0) {
        this.potionBuffer = 0;
        if (this.potions <= 0) {
          game.addText(this.x, this.y - 96, '药水已用尽', '#e08a8a', 14, false);
          sfx.play('block');
        } else if (this.hp >= this.hpMax) {
          game.addText(this.x, this.y - 96, '生命已满', '#bfe8ef', 13, false);
        } else if (this.potionCd <= 0 && this.rollT <= 0) {
          this.potions--;
          const healAmt = Math.round(45 * (this.hasMutation('medic') ? 1.5 : 1));
          this.hp = Math.min(this.hpMax, this.hp + healAmt);
          this.potionCd = 0.7;
          sfx.play('heal');
          game.addText(this.x, this.y - 92, '+' + healAmt + '  ×' + this.potions, '#7cf0c8', 22, false);
          for (let i = 0; i < 22; i++) {
            const a = rand(0, TAU);
            game.emit({
              x: this.x + rand(-16, 16),
              y: this.y - rand(10, 70),
              vx: Math.cos(a) * rand(20, 90),
              vy: Math.sin(a) * rand(20, 80) - 40,
              life: rand(0.4, 0.9),
              size: rand(2, 5),
              color: 'rgba(110,255,190,0.9)',
              glow: true,
              gravity: -60,
              drag: 1.5
            });
          }
        }
      }
    }

    /* ---- 攻击推进 ---- */
    if (this.attackT > 0) {
      const cfg = this.attackCfg;
      this.attackT -= dt;
      const elapsed = cfg.dur - this.attackT;
      const prog = clamp(elapsed / (cfg.dur * 0.62), 0, 1);
      this.attackAngle = lerp(cfg.angleFrom, cfg.angleTo, easeOutCubic(prog));

      const shX = 1;
      const shY = -68;
      const tipX = shX + Math.cos(this.attackAngle) * 84;
      const tipY = shY + Math.sin(this.attackAngle) * 84;
      this.trail.push({ x: tipX, y: tipY, age: 0 });
      if (this.trail.length > 9) this.trail.shift();
      for (const tr of this.trail) tr.age += dt;

      if (!this.attackHit && elapsed >= cfg.active) {
        this.attackHit = true;
        if (cfg.ranged) this.fireRanged(game);
        else this.doMeleeHit(game, cfg);
      }
      if (this.attackT <= 0) {
        this.attackT = 0;
        if (!cfg.air) this.attackIndex = (this.attackIndex + 1) % this.attackCombo.length;
      }
    } else {
      this.trail.length = 0;
      const targetIdle = this.onGround ? -0.55 : -0.9;
      this.attackAngle = lerp(this.attackAngle, targetIdle, 1 - Math.pow(0.0001, dt));
    }

    /* ---- 物理 ---- */
    this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    moveAndCollide(this, dt, game.level);

    if (this.onGround) {
      this.jumps = 0;
      /* 空中下劈落地:取消后摇,重置连击 */
      if (this.attackT > 0 && this.attackCfg && this.attackCfg.air) {
        this.attackT = 0;
        this.attackIndex = 0;
        this.trail.length = 0;
        game.addShake(3);
        for (let i = 0; i < 10; i++) {
          game.emit({
            x: this.x + rand(-30, 30),
            y: this.y - rand(0, 10),
            vx: rand(-180, 180),
            vy: rand(-160, -30),
            life: rand(0.2, 0.4),
            size: rand(2, 5),
            color: 'rgba(190,205,200,0.55)',
            gravity: 500,
            drag: 1.6,
            type: 'smoke'
          });
        }
      }
      if (this.groundPlatform && !this.groundPlatform.oneWay) {
        this.lastSafe.x = clamp(this.x, this.groundPlatform.x + 36, this.groundPlatform.x + this.groundPlatform.w - 36);
        this.lastSafe.y = this.groundPlatform.y;
      }
    }

    if (this.y > GROUND_Y + 90) this.fallRespawn(game);

    /* ---- 状态 ---- */
    if (this.hp > 0) {
      if (this.rollT > 0) this.state = 'roll';
      else if (!this.onGround) this.state = 'air';
      else if (Math.abs(this.vx) > 24) this.state = 'run';
      else this.state = 'idle';
    }

    this.emberT -= dt;
    if (this.emberT <= 0) {
      this.emberT = rand(0.05, 0.1);
      game.emit({
        x: this.x + rand(-7, 9) + this.facing * 2,
        y: this.y - 88 + rand(-8, 2),
        vx: rand(-16, 16),
        vy: rand(-46, -18),
        life: rand(0.35, 0.75),
        size: rand(1.5, 3.4),
        color: Math.random() < 0.5 ? 'rgba(126,244,246,0.9)' : 'rgba(216,255,255,0.9)',
        glow: true,
        gravity: -30,
        drag: 1.2
      });
    }

    this.updateCape(dt, game);
  }

  /* ---------- 远程武器射击 ---------- */
  fireRanged(game) {
    const def = this.weaponDef();
    const item = this.weaponItem();
    let mul = (item ? itemDamageMul(item) : 1) * this.statMul(def);
    if (this.hasMutation('sniper')) mul *= 1.25; // 狙击手:远程 +25%
    const dmg = (def.projDamage || 20) * this.power * mul;
    const kind = def.id === 'warbow' ? 'arrow' : (def.id === 'boomerang' ? 'rang' : 'bolt');
    game.spawnProj(
      this.x + this.facing * 24,
      this.y - 48,
      this.facing * (def.projSpeed || 900),
      0,
      dmg,
      {
        kind,
        life: def.returns ? 1.1 : 1.25,
        pierce: !!def.pierce,
        returns: !!def.returns,
        dot: def.dot || null
      }
    );
  }

  doMeleeHit(game, cfg) {
    const rect = cfg.air
      ? { x: this.x - 56, y: this.y - 24, w: 112, h: 104 } // 下劈:身体前下方
      : {
        x: this.facing > 0 ? this.x + 8 : this.x - 8 - cfg.range,
        y: this.y - cfg.height,
        w: cfg.range,
        h: cfg.height - 6
      };
    /* 武器伤害倍率 = 品质 × 强化 × 词缀 × 属性卷轴 × 变异 */
    const item = this.weaponItem();
    const def = this.weaponDef();
    let mul = (item ? itemDamageMul(item) : 1) * this.statMul(def);
    if (this.hasMutation('brawler')) mul *= 1.2;                        // 斗士:近战 +20%
    if (this.hasMutation('combo') && this.attackIndex === this.attackCombo.length - 1) mul *= 1.5; // 连击大师
    const knockMul = 1 + (this.knockBonus || 0);
    /* 暴击:翻滚必暴窗口 / 完美格挡窗口 / 武器基础暴击 + 词缀暴击 */
    const baseCrit = (def.crit || 0) + (this.critBonus || 0);
    let hitAny = false;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (!rectsOverlap(rect, entityRect(e))) continue;
      const crit = this.rollCrit > 0 || this.parryCrit > 0 || Math.random() < baseCrit;
      /* 刺客:从背后攻击 +40% */
      const backstab = this.hasMutation('assassin') && signOf(this.x - e.x) === e.facing;
      const dmg = cfg.damage * this.power * mul * (backstab ? 1.4 : 1) * (crit ? 1.8 : 1);
      game.damageEnemy(e, dmg, this.x, crit, { knock: (cfg.range > 100 ? 420 : 300) * knockMul });
      /* 武器附带的持续伤害(火炬/骨锯) */
      if (def.dot) applyDot(e, def.dot.type, (def.dot.dps || 0) * this.power, def.dot.dur);
      /* 词缀触发的持续伤害 */
      if (item && item.sum) {
        if (item.sum.burn) applyDot(e, 'burn', item.sum.burn, 3);
        if (item.sum.bleed) applyDot(e, 'bleed', item.sum.bleed, 3);
        if (item.sum.poison) applyDot(e, 'poison', item.sum.poison, 4);
        if (item.sum.frost) applyDot(e, 'frost', 0, 2);
      }
      /* 眩晕(钉锤) */
      if (def.stun) e.stun = Math.max(e.stun, def.stun);
      hitAny = true;
    }
    /* 雷刃:挥出冲击波 */
    if (def.wave && hitAny) {
      game.spawnShockwave(this.x + this.facing * 40, this.y, this.facing, cfg.damage * this.power * mul * 0.55, 'player');
    }
    if (hitAny) {
      game.hitStop = Math.max(game.hitStop, cfg.range > 100 ? 0.075 : 0.045);
      game.addShake(cfg.range > 100 ? 6 : 3.5);
    }
  }

  fallRespawn(game) {
    this.hp -= 12;
    this.x = this.lastSafe.x;
    this.y = this.lastSafe.y - 4;
    this.vx = 0;
    this.vy = 0;
    this.rollT = 0;
    this.invuln = 1.2;
    game.addShake(9);
    game.hurtFlash = 0.55;
    game.addText(this.x, this.y - 96, '-12', '#ff6b6b', 20, false);
    sfx.play('hurt');
    if (this.hp <= 0) {
      this.hp = 0;
      game.killPlayer();
    }
  }
}

/* =========================================================
   敌人
   ========================================================= */
function spawnEnemy(type, x, y, stage) {
  const hpMul = 1 + 0.36 * (stage - 1);
  const dmgMul = 1 + 0.2 * (stage - 1);
  const e = {
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    facing: -1,
    w: 40,
    h: 64,
    hp: 50,
    maxHp: 50,
    damage: 10,
    onGround: false,
    groundPlatform: null,
    stun: 0,
    hitFlash: 0,
    hpShow: 0,
    dead: false,
    animT: Math.random() * 10,
    state: 'idle',
    stateT: 0,
    attackCd: rand(0.6, 1.4),
    hitDone: false,
    phase: Math.random() * TAU,
    damageMul: dmgMul
  };

  switch (type) {
    case 'husk':
      e.w = 42; e.h = 66; e.hp = Math.round(52 * hpMul); e.damage = 11 * dmgMul;
      break;
    case 'shield':
      e.w = 48; e.h = 72; e.hp = Math.round(96 * hpMul); e.damage = 16 * dmgMul;
      e.turnT = 0;
      break;
    case 'grenadier':
      e.w = 38; e.h = 62; e.hp = Math.round(46 * hpMul); e.damage = 8 * dmgMul;
      break;
    case 'bat':
      e.w = 46; e.h = 30; e.hp = Math.round(26 * hpMul); e.damage = 9 * dmgMul;
      e.y = y - 170;
      e.hoverY = e.y;
      e.homeX = x;
      e.contactCd = 0;
      e.state = 'hover';
      break;
    case 'boss':
      e.w = 118; e.h = 158; e.hp = 620 + 220 * (Math.floor(stage / 3) - 1);
      e.damage = 22 * dmgMul;
      e.animT = 0;
      e.state = 'idle';
      e.attackCd = 1.2;
      e.chargeDir = -1;
      e.slammed = false;
      break;
    default:
      break;
  }
  e.maxHp = e.hp;
  return e;
}

function updateEnemy(e, dt, game) {
  if (e.dead) return;

  e.animT += dt;
  e.hitFlash = Math.max(0, e.hitFlash - dt);
  e.hpShow = Math.max(0, e.hpShow - dt);
  e.attackCd = Math.max(0, e.attackCd - dt);

  /* 持续伤害(燃烧/流血/中毒)与减速 */
  if (e.dots) tickEnemyDots(e, dt, game);
  if (e.dead) return;
  if (e.slowT > 0) e.slowT = Math.max(0, e.slowT - dt);
  const sp = (e.slowT > 0 ? (e.slowMul || 0.55) : 1) * (game.tideActive ? TIDE_CFG.enemySpeed : 1);

  if (e.stun > 0) {
    e.stun -= dt;
    if (e.type === 'bat') {
      e.vy += GRAVITY * 0.35 * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vx *= 0.96;
      if (e.stun <= 0) {
        e.state = 'return';
        e.vy = 0;
      }
      return;
    }
    e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
    if (e.type !== 'boss') moveAndCollide(e, dt, game.level);
    else {
      e.x += e.vx * dt;
      e.vx *= 0.94;
    }
    return;
  }

  /* 烟雾弹:敌人丢失目标,原地游荡 */
  if (game.smokeT > 0 && e.type !== 'boss') {
    e.vx *= Math.pow(0.02, dt);
    if (e.type === 'bat') return;
    e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
    moveAndCollide(e, dt, game.level);
    return;
  }

  switch (e.type) {
    case 'husk': updateHusk(e, dt, game); break;
    case 'shield': updateShield(e, dt, game); break;
    case 'grenadier': updateGrenadier(e, dt, game); break;
    case 'bat': updateBat(e, dt, game); return;
    case 'boss': updateBoss(e, dt, game); return;
    default: break;
  }
  e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
  if (sp !== 1) e.vx *= sp; // 寒霜减速 / 潮汐加速
  moveAndCollide(e, dt, game.level);
}

function facePlayer(e, p) {
  e.facing = p.x >= e.x ? 1 : -1;
}

function updateHusk(e, dt, game) {
  const p = game.player;
  const adx = Math.abs(p.x - e.x);
  const ady = Math.abs(p.y - e.y);

  if (e.state === 'windup') {
    e.stateT -= dt;
    e.vx *= 0.8;
    facePlayer(e, p);
    if (e.stateT <= 0) {
      e.state = 'strike';
      e.stateT = 0.19;
      e.vx = e.facing * 380;
      e.hitDone = false;
    }
  } else if (e.state === 'strike') {
    e.stateT -= dt;
    if (!e.hitDone && adx < 96 && ady < 84) {
      e.hitDone = true;
      if (circleRect(p.x, p.y - 38, 26, entityRect(e))) {
        game.hurtPlayer(e.damage, e.x);
      }
    }
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = 0.42;
      e.attackCd = 1.15;
      e.vx *= 0.2;
    }
  } else if (e.state === 'recover') {
    e.stateT -= dt;
    e.vx *= 0.86;
    if (e.stateT <= 0) e.state = 'idle';
  } else {
    if (adx < 440 && ady < 150) {
      facePlayer(e, p);
      if (adx < 92 && e.attackCd <= 0) {
        e.state = 'windup';
        e.stateT = 0.42;
        e.vx = 0;
        e.attackCd = 1.35;
      } else {
        e.vx = approach(e.vx, e.facing * 158, 950 * dt);
        if (e.onGround && !hasGroundAhead(e, game.level)) e.vx = 0;
      }
    } else {
      if (e.onGround && !hasGroundAhead(e, game.level)) e.facing *= -1;
      e.vx = approach(e.vx, e.facing * 58, 520 * dt);
    }
  }
}

function updateShield(e, dt, game) {
  const p = game.player;
  const adx = Math.abs(p.x - e.x);
  const ady = Math.abs(p.y - e.y);

  e.turnT = Math.max(0, e.turnT - dt);
  if (e.turnT <= 0 && adx < 620) {
    facePlayer(e, p);
    e.turnT = 0.62;
  }

  if (e.state === 'windup') {
    e.stateT -= dt;
    e.vx *= 0.8;
    if (e.stateT <= 0) {
      e.state = 'strike';
      e.stateT = 0.26;
      e.vx = e.facing * 360;
      e.hitDone = false;
      sfx.play('dash');
    }
  } else if (e.state === 'strike') {
    e.stateT -= dt;
    if (!e.hitDone && adx < 105 && ady < 86) {
      e.hitDone = true;
      if (circleRect(p.x, p.y - 38, 28, entityRect(e))) game.hurtPlayer(e.damage, e.x);
    }
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = 0.5;
      e.attackCd = 1.7;
      e.vx *= 0.2;
    }
  } else if (e.state === 'recover') {
    e.stateT -= dt;
    e.vx *= 0.86;
    if (e.stateT <= 0) e.state = 'idle';
  } else {
    if (adx < 760 && ady < 160) {
      if (adx < 108 && e.attackCd <= 0) {
        e.state = 'windup';
        e.stateT = 0.58;
        e.vx = 0;
        e.attackCd = 1.9;
      } else {
        e.vx = approach(e.vx, e.facing * 82, 600 * dt);
        if (e.onGround && !hasGroundAhead(e, game.level)) e.vx = 0;
      }
    } else {
      e.vx = approach(e.vx, 0, 500 * dt);
    }
  }
}

function updateGrenadier(e, dt, game) {
  const p = game.player;
  const adx = Math.abs(p.x - e.x);
  const ady = Math.abs(p.y - e.y);

  if (e.state === 'windup') {
    e.stateT -= dt;
    e.vx *= 0.8;
    facePlayer(e, p);
    if (e.stateT <= 0) {
      e.state = 'idle';
      e.attackCd = 2.5;
      const dx = p.x - e.x;
      const dir = dx >= 0 ? 1 : -1;
      game.spawnBomb(
        e.x + dir * 18,
        e.y - 52,
        clamp(dx * 0.8, -340, 340),
        -540,
        1.15,
        84,
        15 * e.damageMul,
        'enemy'
      );
      sfx.play('throw');
    }
    return;
  }

  if (adx < 560 && ady < 200) {
    facePlayer(e, p);
    if (adx < 210) {
      // 后退
      e.vx = approach(e.vx, -e.facing * 120, 800 * dt);
      if (e.onGround && !hasGroundAhead(e, game.level)) e.vx = 0;
    } else if (adx > 430) {
      e.vx = approach(e.vx, e.facing * 90, 600 * dt);
      if (e.onGround && !hasGroundAhead(e, game.level)) e.vx = 0;
    } else {
      e.vx = approach(e.vx, 0, 700 * dt);
    }
    if (e.attackCd <= 0 && adx < 520) {
      e.state = 'windup';
      e.stateT = 0.52;
      e.vx = 0;
    }
  } else {
    e.vx = approach(e.vx, 0, 600 * dt);
  }
}

function updateBat(e, dt, game) {
  const p = game.player;
  const dx = p.x - e.x;
  const dy = (p.y - 40) - e.y;
  const d = Math.hypot(dx, dy);

  e.contactCd = Math.max(0, e.contactCd - dt);

  if (e.state === 'hover') {
    e.x = e.homeX + Math.sin(e.animT * 1.6 + e.phase) * 42;
    e.y = e.hoverY + Math.sin(e.animT * 3.2 + e.phase) * 16;
    e.facing = dx >= 0 ? 1 : -1;
    if (d < 480) {
      e.state = 'dive';
      e.stateT = 0.72;
      const len = Math.max(1, d);
      e.vx = (dx / len) * 340;
      e.vy = (dy / len) * 340;
    }
  } else if (e.state === 'dive') {
    e.stateT -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.vx *= 0.995;
    e.vy *= 0.995;
    if (e.contactCd <= 0 && circleRect(p.x, p.y - 38, 30, entityRect(e))) {
      e.contactCd = 0.9;
      game.hurtPlayer(e.damage, e.x);
    }
    if (e.stateT <= 0) {
      e.state = 'return';
      e.stateT = 1.4;
    }
  } else if (e.state === 'return') {
    const hx = e.homeX;
    const hy = e.hoverY;
    const ddx = hx - e.x;
    const ddy = hy - e.y;
    const len = Math.hypot(ddx, ddy);
    if (len < 14 || e.stateT <= 0) {
      e.state = 'hover';
      e.vx = 0;
      e.vy = 0;
    } else {
      e.x += (ddx / len) * 220 * dt;
      e.y += (ddy / len) * 220 * dt;
    }
    e.stateT -= dt;
  }
  e.y = clamp(e.y, 80, GROUND_Y - 10);
}

function updateBoss(e, dt, game) {
  const p = game.player;
  const adx = Math.abs(p.x - e.x);
  facePlayer(e, p);

  if (e.state === 'idle') {
    if (adx > 150) e.vx = approach(e.vx, e.facing * 92, 500 * dt);
    else e.vx = approach(e.vx, 0, 700 * dt);
    if (e.attackCd <= 0) {
      if (adx < 250 || Math.random() < 0.45) {
        e.state = 'slamWind';
        e.stateT = 0.7;
        e.vx = 0;
        sfx.play('boss');
      } else {
        e.state = 'chargeWind';
        e.stateT = 0.55;
        e.vx = 0;
        sfx.play('boss');
      }
    }
  } else if (e.state === 'slamWind') {
    e.stateT -= dt;
    e.vx = 0;
    if (e.stateT <= 0) {
      e.state = 'slam';
      e.stateT = 0.42;
      e.slammed = false;
      game.addShake(13);
      game.hitStop = Math.max(game.hitStop, 0.05);
      sfx.play('explode');
      for (let i = 0; i < 26; i++) {
        game.emit({
          x: e.x + rand(-70, 70),
          y: GROUND_Y + rand(-8, 4),
          vx: rand(-260, 260),
          vy: rand(-420, -80),
          life: rand(0.4, 0.9),
          size: rand(3, 8),
          color: Math.random() < 0.5 ? 'rgba(120,110,95,0.9)' : 'rgba(200,170,120,0.8)',
          gravity: 900,
          type: 'rock'
        });
      }
      game.spawnShockwave(e.x, GROUND_Y, -1, 18 * e.damageMul);
      game.spawnShockwave(e.x, GROUND_Y, 1, 18 * e.damageMul);
      if (adx < 190 && p.y > GROUND_Y - 150) game.hurtPlayer(20 * e.damageMul, e.x);
    }
  } else if (e.state === 'slam') {
    e.stateT -= dt;
    e.vx = 0;
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = 0.7;
      e.attackCd = rand(1.2, 2.0);
    }
  } else if (e.state === 'chargeWind') {
    e.stateT -= dt;
    e.vx = 0;
    if (e.stateT <= 0) {
      e.state = 'charge';
      e.stateT = 0.75;
      e.vx = e.facing * 760;
      e.hitDone = false;
      sfx.play('dash');
    }
  } else if (e.state === 'charge') {
    e.stateT -= dt;
    e.x += e.vx * dt;
    e.x = clamp(e.x, game.level.arenaX + 130, game.level.width - 210);
    if (!e.hitDone && circleRect(p.x, p.y - 38, 34, entityRect(e))) {
      e.hitDone = true;
      game.hurtPlayer(24 * e.damageMul, e.x);
    }
    game.emit({
      x: e.x - e.facing * 20,
      y: e.y - rand(0, 20),
      vx: -e.facing * rand(40, 150),
      vy: rand(-140, -20),
      life: rand(0.2, 0.5),
      size: rand(3, 8),
      color: 'rgba(180,150,110,0.5)',
      gravity: -40,
      type: 'smoke'
    });
    if (e.stateT <= 0) {
      e.state = 'recover';
      e.stateT = 0.6;
      e.attackCd = rand(1.1, 1.8);
      e.vx = 0;
    }
  } else if (e.state === 'recover') {
    e.stateT -= dt;
    e.vx *= 0.9;
    if (e.stateT <= 0) e.state = 'idle';
  }

  if (e.state !== 'charge') {
    e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
    moveAndCollide(e, dt, game.level);
  }
}

function updateEnemySeparation(enemies, dt) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (a.dead || a.type === 'bat' || a.type === 'boss') continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (b.dead || b.type === 'bat' || b.type === 'boss') continue;
      const dx = b.x - a.x;
      if (Math.abs(dx) < 26 && Math.abs(a.y - b.y) < 40) {
        const push = (26 - Math.abs(dx)) * 0.5;
        const dir = dx >= 0 ? 1 : -1;
        a.x -= dir * push * 0.5;
        b.x += dir * push * 0.5;
      }
    }
  }
}
