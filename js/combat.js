'use strict';

/* =========================================================
   战斗结算 · 投射物 · 掉落 · 粒子
   ========================================================= */

const triggerPlayerDeath = killPlayer;

/* ---------- 掉落物 ---------- */
function spawnPickup(game, type, x, y, value, vx, vy) {
  if (game.pickups.length > 150) return null;
  const p = {
    type,
    x,
    y,
    vx,
    vy,
    value,
    seed: rand(0, TAU),
    age: 0,
    collected: false,
    onGround: false
  };
  game.pickups.push(p);
  return p;
}

function collectPickup(game, p) {
  if (p.collected) return;
  p.collected = true;
  const pl = game.player;
  if (p.type === 'scroll') {
    /* 属性卷轴:触发三选一 */
    sfx.play('equip');
    game.addText(p.x, p.y - 24, '属性卷轴', '#c79bff', 16, true);
    openScrollChoice();
    return;
  }
  if (p.type === 'gold') {
    let amount = p.value;
    if (pl) amount = Math.round(amount * (1 + (pl.greedBonus || 0)) * (pl.hasMutation && pl.hasMutation('greed') ? 1.5 : 1));
    game.run.gold += amount;
    sfx.play('coin');
    for (let i = 0; i < 5; i++) {
      game.emit({
        x: p.x,
        y: p.y,
        vx: rand(-70, 70),
        vy: rand(-110, -20),
        life: rand(0.2, 0.42),
        size: rand(1.2, 2.6),
        color: 'rgba(255,215,120,0.95)',
        glow: true,
        gravity: 300,
        drag: 2
      });
    }
  } else {
    let cellAmt = p.value;
    if (pl) cellAmt = Math.round(cellAmt * (1 + (pl.cellsBonus || 0)) * (pl.hasMutation && pl.hasMutation('cellular') ? 1.3 : 1));
    game.run.cells += cellAmt;
    sfx.play('cell');
    game.addText(p.x, p.y - 20, '+' + cellAmt, '#7df3ec', 13, false);
    for (let i = 0; i < 7; i++) {
      game.emit({
        x: p.x,
        y: p.y,
        vx: rand(-90, 90),
        vy: rand(-140, -30),
        life: rand(0.25, 0.55),
        size: rand(1.3, 3),
        color: 'rgba(140,250,245,0.95)',
        glow: true,
        gravity: 260,
        drag: 1.8
      });
    }
  }
}

/* ---------- 持续伤害(燃烧/流血/中毒) ---------- */
function applyDot(e, type, dps, dur) {
  /* 变异纵火狂:燃烧伤害 +60% */
  if (type === 'burn' && game.player && game.player.hasMutation && game.player.hasMutation('pyro')) dps *= 1.6;
  if (type === 'frost') { // 寒霜不算 DoT,转减速
    e.slowT = Math.max(e.slowT || 0, dur);
    e.slowMul = 0.55;
    return;
  }
  if (!e.dots) e.dots = {};
  const cur = e.dots[type];
  e.dots[type] = {
    dps: Math.max(dps, cur ? cur.dps : 0),
    t: Math.max(dur, cur ? cur.t : 0)
  };
}

/* 每帧结算 DoT:0.5s 一跳,直接扣血(无击退硬直) */
function tickEnemyDots(e, dt, game) {
  if (!e.dots) return;
  let sum = 0;
  for (const k in e.dots) {
    const d = e.dots[k];
    d.t -= dt;
    if (d.t <= 0 || d.dps <= 0) { delete e.dots[k]; continue; }
    sum += d.dps;
  }
  if (sum > 0) {
    e.dotAcc = (e.dotAcc || 0) + sum * dt;
    e.dotFxT = (e.dotFxT || 0) - dt;
    if (e.dotFxT <= 0) { // 燃烧/中毒余焰粒子
      e.dotFxT = 0.14;
      const col = e.dots.burn ? 'rgba(255,150,70,0.85)' : (e.dots.poison ? 'rgba(150,230,120,0.8)' : 'rgba(220,80,80,0.8)');
      game.emit({
        x: e.x + rand(-e.w * 0.3, e.w * 0.3),
        y: e.y - rand(6, e.h * 0.8),
        vx: rand(-16, 16), vy: rand(-70, -30),
        life: rand(0.25, 0.5), size: rand(1.5, 3.4),
        color: col, glow: true, gravity: -40, drag: 1.4
      });
    }
  }
  e.dotTickT = (e.dotTickT || 0) + dt;
  if (e.dotTickT >= 0.5) {
    const dmg = Math.round(e.dotAcc || 0);
    e.dotTickT = 0;
    e.dotAcc = 0;
    if (dmg > 0 && !e.dead) {
      e.hp -= dmg;
      e.hpShow = Math.max(e.hpShow, 1);
      game.addText(e.x + rand(-8, 8), e.y - e.h - 4, dmg, '#ff9d6b', 13, false);
      if (e.hp <= 0) killEnemy(game, e, e.x);
    }
  }
}

/* ---------- 最近敌人(弹反定位攻击者/箭塔索敌) ---------- */
function nearestEnemy(game, x, maxDist) {
  let best = null;
  let bd = maxDist || 1e9;
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = Math.abs(e.x - x);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/* ---------- 弩箭塔(技能) ---------- */
function updateTurrets(game, dt) {
  if (!game.turrets) return;
  for (let i = game.turrets.length - 1; i >= 0; i--) {
    const t = game.turrets[i];
    t.t -= dt;
    t.cd -= dt;
    if (t.t <= 0) {
      game.turrets.splice(i, 1);
      for (let n = 0; n < 8; n++) {
        game.emit({
          x: t.x + rand(-10, 10), y: t.y - rand(6, 40),
          vx: rand(-60, 60), vy: rand(-120, -30),
          life: rand(0.2, 0.45), size: rand(2, 4),
          color: 'rgba(150,170,175,0.6)', gravity: 300, drag: 1.5, type: 'smoke'
        });
      }
      continue;
    }
    if (t.cd <= 0) {
      const target = nearestEnemy(game, t.x, t.range);
      if (target) {
        t.cd = 0.7;
        t.facing = signOf(target.x - t.x) || t.facing;
        const ty = target.y - target.h * 0.55;
        const dx = target.x - t.x;
        const dy = ty - (t.y - 46);
        const len = Math.hypot(dx, dy) || 1;
        game.spawnProj(t.x + t.facing * 14, t.y - 46, (dx / len) * 920, (dy / len) * 920, t.damage, { kind: 'arrow', life: 1.3 });
        sfx.play('throw');
      } else {
        t.cd = 0.2;
      }
    }
  }
}

/* ---------- 粒子 ---------- */
function bloodBurst(x, y, dir, color, count) {
  const n = count || 10;
  for (let i = 0; i < n; i++) {
    const a = rand(-0.85, 0.85);
    const sp = rand(70, 330);
    game.emit({
      x: x + rand(-6, 6),
      y: y + rand(-8, 8),
      vx: Math.cos(a) * sp * (dir >= 0 ? 1 : -1) + rand(-40, 40),
      vy: Math.sin(a) * sp - rand(20, 120),
      life: rand(0.32, 0.78),
      size: rand(1.6, 4.2),
      color,
      gravity: 1500,
      drag: 1.1
    });
  }
  for (let i = 0; i < Math.max(2, Math.floor(n * 0.35)); i++) {
    game.emit({
      x: x + rand(-10, 10),
      y: y + rand(-12, 12),
      vx: rand(-50, 50),
      vy: rand(-90, -10),
      life: rand(0.3, 0.6),
      size: rand(3, 8),
      color: 'rgba(120,24,32,0.45)',
      gravity: -40,
      drag: 2.4,
      type: 'smoke'
    });
  }
}

function updateParticles(game, dt) {
  const arr = game.particles;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    p.life -= dt;
    if (p.life <= 0) {
      arr.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    if (p.drag) {
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
    }
    if (p.type === 'rock') p.rot = (p.rot || 0) + (p.spin || 6) * dt;
  }
}

function updateTexts(game, dt) {
  const arr = game.texts;
  for (let i = arr.length - 1; i >= 0; i--) {
    const t = arr[i];
    t.age += dt;
    t.life -= dt;
    t.y += t.vy * dt;
    t.vy *= Math.pow(0.12, dt);
    if (t.life <= 0) arr.splice(i, 1);
  }
}

/* ---------- 敌人死亡 ---------- */
function killEnemy(game, e, fromX) {
  if (e.dead) return;
  e.dead = true;
  e.hp = 0;
  e.vx = 0;
  game.run.kills++;

  const dir = signOf(e.x - fromX) || 1;
  const isBoss = e.type === 'boss';
  const bodyColor =
    e.type === 'husk' ? 'rgba(118,50,48,0.85)' :
    e.type === 'shield' ? 'rgba(96,110,96,0.85)' :
    e.type === 'grenadier' ? 'rgba(108,84,52,0.85)' :
    e.type === 'bat' ? 'rgba(104,42,56,0.85)' :
    'rgba(126,46,44,0.9)';

  bloodBurst(e.x, e.y - e.h * 0.55, dir, bodyColor, isBoss ? 46 : 18);

  const shards = isBoss ? 34 : 12;
  for (let i = 0; i < shards; i++) {
    const a = rand(0, TAU);
    const sp = rand(50, isBoss ? 360 : 210);
    game.emit({
      x: e.x + rand(-e.w * 0.4, e.w * 0.4),
      y: e.y - rand(6, e.h),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - rand(40, 160),
      life: rand(0.4, 1.0),
      size: rand(2, isBoss ? 7 : 4.5),
      color: bodyColor,
      gravity: 1400,
      drag: 0.8
    });
  }
  for (let i = 0; i < (isBoss ? 16 : 6); i++) {
    game.emit({
      x: e.x + rand(-e.w * 0.5, e.w * 0.5),
      y: e.y - rand(4, e.h * 0.8),
      vx: rand(-60, 60),
      vy: rand(-120, -20),
      life: rand(0.45, 0.9),
      size: rand(4, isBoss ? 16 : 9),
      color: 'rgba(40,25,28,0.4)',
      gravity: -80,
      drag: 1.6,
      type: 'smoke'
    });
  }

  // 灵魂光点
  for (let i = 0; i < (isBoss ? 18 : 6); i++) {
    game.emit({
      x: e.x + rand(-e.w * 0.4, e.w * 0.4),
      y: e.y - e.h * 0.5,
      vx: rand(-40, 40),
      vy: rand(-160, -60),
      life: rand(0.6, 1.2),
      size: rand(1.4, 3),
      color: isBoss ? 'rgba(255,190,120,0.9)' : 'rgba(150,245,240,0.75)',
      glow: true,
      gravity: -30,
      drag: 1.2
    });
  }

  // 货币
  const goldCount = isBoss ? 10 : randInt(2, 4);
  for (let i = 0; i < goldCount; i++) {
    spawnPickup(
      game,
      'gold',
      e.x + rand(-16, 16),
      e.y - e.h * 0.5,
      randInt(2, 5) + (isBoss ? 8 : 0),
      rand(-140, 140),
      rand(-460, -180)
    );
  }
  const cellCount = isBoss ? 12 : (Math.random() < 0.62 ? 1 : 0);
  for (let i = 0; i < cellCount; i++) {
    spawnPickup(
      game,
      'cell',
      e.x + rand(-22, 22),
      e.y - e.h * 0.5 - rand(0, 30),
      1,
      rand(-180, 180),
      rand(-520, -220)
    );
  }

  sfx.play('kill');

  /* 疫病潮汐:击杀加速感染 */
  game.infection = Math.min(TIDE_CFG.threshold, game.infection + TIDE_CFG.killBonus);

  /* 变异嗜血:击杀回复生命 */
  const pl = game.player;
  if (pl && !pl.dead && pl.hasMutation && pl.hasMutation('bloodthirst')) {
    pl.hp = Math.min(pl.hpMax, pl.hp + 4);
    game.addText(pl.x, pl.y - 96, '+4', '#7cf0c8', 13, false);
  }

  /* 装备掉落:普通敌人 10% 掉一件(潮汐期间翻倍);Boss 必掉武器 + 图纸 */
  const dropChance = 0.1 * (game.tideActive ? TIDE_CFG.dropMul : 1);
  if (isBoss) {
    rollItemDrop(game, e.x - 30, e.y - e.h * 0.6, 'weapon');
    rollBlueprintDrop(game, e.x + 40, e.y - e.h * 0.6);
  } else if (Math.random() < dropChance) {
    rollItemDrop(game, e.x, e.y - e.h * 0.5);
  }

  if (isBoss) {
    game.hitStop = Math.max(game.hitStop, 0.16);
    game.addShake(22);
    showToast('封印解除 · 前往传送门', 3);
    game.addText(e.x, e.y - e.h - 24, '狱卒已被击败', '#ffd9a0', 22, true);
    for (let i = 0; i < 30; i++) {
      game.emit({
        x: e.x + rand(-80, 80),
        y: GROUND_Y + rand(-10, 4),
        vx: rand(-360, 360),
        vy: rand(-520, -120),
        life: rand(0.5, 1.1),
        size: rand(3, 8),
        color: Math.random() < 0.5 ? 'rgba(255,170,90,0.9)' : 'rgba(255,230,180,0.9)',
        glow: true,
        gravity: 1000,
        drag: 0.5,
        type: 'rock',
        spin: rand(-12, 12)
      });
    }
    sfx.play('explode');
  }
}

/* =========================================================
   为 game 注入战斗方法
   ========================================================= */
Object.assign(game, {
  killPlayer() {
    triggerPlayerDeath();
  },

  addShake(v) {
    this.shake = Math.min(26, this.shake + v);
  },

  emit(p) {
    if (!p || typeof p.life !== 'number' || p.life <= 0) return;
    if (this.particles.length > 520) this.particles.shift();
    if (p.maxLife === undefined) p.maxLife = p.life;
    if (!p.type) p.type = 'circle';
    if (p.type === 'rock' && p.rot === undefined) p.rot = rand(0, TAU);
    this.particles.push(p);
  },

  addText(x, y, text, color, size, crit) {
    if (this.texts.length > 64) this.texts.shift();
    this.texts.push({
      x,
      y,
      vy: -64,
      life: 0.9,
      maxLife: 0.9,
      age: 0,
      text: String(text),
      color: color || '#ffffff',
      size: size || 16,
      crit: !!crit
    });
  },

  /* 拾取地面最近的装备/图纸。返回 true 表示本次 E 已被拾取消费 */
  tryPickup() {
    const p = this.player;
    if (!p || p.dead) return false;
    let best = null;
    let bd = 110;
    for (const pk of this.pickups) {
      if (pk.collected) continue;
      if (pk.type !== 'item' && pk.type !== 'blueprint' && pk.type !== 'echo') continue;
      const d = Math.hypot(pk.x - p.x, (pk.y - (p.y - 34)) * 0.75);
      if (d < bd) { bd = d; best = pk; }
    }
    if (!best) return false;

    /* 回响残片:取回上一局的遗产 */
    if (best.type === 'echo') {
      best.collected = true;
      openEcho();
      return true;
    }

    /* 图纸:永久解锁掉落池 */
    if (best.type === 'blueprint') {
      const meta = this.meta || (this.meta = {});
      if (!meta.blueprints) meta.blueprints = [];
      if (!meta.blueprints.includes(best.blueprintId)) meta.blueprints.push(best.blueprintId);
      const def = WEAPON_MAP[best.blueprintId];
      best.collected = true;
      saveMeta();
      this.addText(p.x, p.y - 96, '解锁图纸:' + (def ? def.name : '?'), '#9df3ff', 18, true);
      showToast('新武器图纸已解锁 · 后续掉落池加入 ' + (def ? def.name : ''), 2.6);
      sfx.play('equip');
      return true;
    }

    /* 装备:同槽位则替换,旧装备掉回地面 */
    const item = best.item;
    if (!item) { best.collected = true; return true; }
    const old = equipItem(p, item);
    best.collected = true;
    if (old) dropItemPickup(this, old, p.x - p.facing * 28, p.y);
    this.addText(p.x, p.y - 96, '装备 ' + itemName(item), itemRarity(item).color, 16, false);
    sfx.play('equip');
    return true;
  },

  damageEnemy(e, amount, fromX, crit, opts) {
    if (!e || e.dead) return;
    const o = opts || {};

    // 盾卫正面格挡：翻滚后的暴击与背后攻击可破防
    if (e.type === 'shield' && !crit && !o.ignoreBlock &&
        signOf(fromX - e.x) === e.facing) {
      e.hitFlash = 0.1;
      e.hpShow = 1.4;
      this.addText(e.x, e.y - e.h - 6, '格挡', '#cfe6e2', 14, false);
      for (let i = 0; i < 9; i++) {
        this.emit({
          x: e.x + e.facing * 22,
          y: e.y - e.h * 0.55 + rand(-24, 24),
          vx: e.facing * rand(40, 220),
          vy: rand(-170, 60),
          life: rand(0.15, 0.36),
          size: rand(1, 2.4),
          color: 'rgba(255,232,175,0.95)',
          glow: true,
          type: 'spark',
          gravity: 520,
          drag: 1.4
        });
      }
      if (this.player) this.player.vx -= e.facing * 140;
      sfx.play('block');
      this.hitStop = Math.max(this.hitStop, 0.03);
      this.addShake(2.5);
      return;
    }

    const dmg = Math.max(1, amount);
    e.hp -= dmg;
    e.hpShow = 3;
    e.hitFlash = 0.16;

    const dir = signOf(e.x - fromX) || 1;
    const mass = e.type === 'boss' ? 0.16 : (e.type === 'shield' ? 0.5 : 1);
    const knock = (o.knock !== undefined ? o.knock : 260) * mass;
    e.vx += dir * knock;

    if (e.type === 'bat') {
      e.vy -= 70;
      e.stun = Math.max(e.stun, 0.26);
    } else if (e.type === 'boss') {
      e.stun = Math.max(e.stun, 0.05);
    } else {
      e.stun = Math.max(e.stun, crit ? 0.34 : 0.16);
    }

    this.addText(
      e.x + rand(-6, 6),
      e.y - e.h - 12,
      Math.round(dmg),
      crit ? '#ffe27a' : '#ffb7ae',
      crit ? 24 : 17,
      crit
    );
    bloodBurst(e.x + dir * 6, e.y - e.h * 0.58, dir, '#a82731', crit ? 16 : 9);
    sfx.play(crit ? 'crit' : 'hit');

    if (crit) {
      this.hitStop = Math.max(this.hitStop, 0.035);
      this.addShake(3);
    }

    if (e.hp <= 0) killEnemy(this, e, fromX);
  },

  hurtPlayer(amount, fromX, opts) {
    const p = this.player;
    if (!p || p.dead || this.state !== 'playing') return;
    if (p.invuln > 0 || p.rollT > 0) return;

    const origin = fromX === undefined ? p.x - p.facing * 20 : fromX;
    const fromDir = signOf(origin - p.x) || p.facing; // 攻击来向
    /* 疫病潮汐:敌人伤害提升 */
    const scaled = amount * (this.tideActive ? TIDE_CFG.enemyDmg : 1);

    /* ---------- 举盾格挡(仅正面) ---------- */
    if (p.blockHeld && fromDir === p.facing) {
      const shield = (p.gear.shield && SHIELD_MAP[p.gear.shield.defId]) || SHIELD_MAP.woodshield;

      /* 完美格挡:举盾后 parry 秒窗口内 */
      if (p.blockT <= shield.parry) {
        p.parryCrit = 3; // 3 秒暴击窗口
        this.hitStop = Math.max(this.hitStop, 0.06);
        this.addShake(5);
        sfx.play('parry');
        // 攻击者硬直
        const atk = (opts && opts.attacker && !opts.attacker.dead)
          ? opts.attacker
          : nearestEnemy(this, origin, 170);
        if (atk && atk.type !== 'boss') atk.stun = Math.max(atk.stun, shield.parryStun || 1.2);
        else if (atk) atk.stun = Math.max(atk.stun, 0.22);
        // 荆棘盾反刺
        if (shield.thorns && atk) this.damageEnemy(atk, shield.thorns * p.power, p.x, false, { knock: 200 });
        this.addText(p.x, p.y - 102, '完美格挡!', '#9df3ff', 20, true);
        for (let i = 0; i < 16; i++) {
          const a = rand(-1.2, 1.2);
          this.emit({
            x: p.x + p.facing * 24,
            y: p.y - 46 + rand(-20, 20),
            vx: Math.cos(a) * p.facing * rand(120, 420),
            vy: Math.sin(a) * rand(120, 320) - 100,
            life: rand(0.14, 0.34),
            size: rand(1.2, 3),
            color: 'rgba(160,240,255,0.95)',
            glow: true,
            type: 'spark',
            gravity: 500,
            drag: 1.4
          });
        }
        return;
      }

      /* 普通格挡:按盾牌减伤 */
      const dmg = Math.max(0, Math.round(scaled * (1 - shield.reduce)));
      sfx.play('block');
      this.hitStop = Math.max(this.hitStop, 0.03);
      for (let i = 0; i < 8; i++) {
        this.emit({
          x: p.x + p.facing * 22,
          y: p.y - 46 + rand(-18, 18),
          vx: p.facing * rand(60, 260),
          vy: rand(-160, 60),
          life: rand(0.12, 0.28),
          size: rand(1, 2.4),
          color: 'rgba(210,225,230,0.9)',
          glow: true,
          type: 'spark',
          gravity: 520,
          drag: 1.4
        });
      }
      if (dmg <= 0) {
        this.addText(p.x, p.y - 96, '格挡', '#cfe6e2', 14, false);
        return;
      }
      p.hp -= dmg;
      p.invuln = 0.5;
      p.hurtT = 0.16;
      p.vx = signOf(p.x - origin) * 140; // 格挡小幅击退
      this.addText(p.x, p.y - 96, '-' + dmg, '#9fc6cf', 16, false);
      this.addShake(3);
      if (p.hp <= 0) {
        p.hp = 0;
        triggerPlayerDeath();
      }
      return;
    }

    /* ---------- 正常受击 ---------- */
    const dmg = Math.max(1, Math.round(scaled));
    p.hp -= dmg;
    p.invuln = 0.8;
    p.hurtT = 0.28;

    /* 变异荆棘:反弹伤害给攻击者 */
    if (p.hasMutation && p.hasMutation('thorns')) {
      const atk = (opts && opts.attacker && !opts.attacker.dead) ? opts.attacker : nearestEnemy(this, p.x, 170);
      if (atk) this.damageEnemy(atk, 12, p.x, false, { knock: 120, ignoreBlock: true });
    }

    const dir = signOf(p.x - origin) || -p.facing;
    p.vx = dir * 250;
    if (p.onGround) p.vy = Math.min(p.vy, -240);

    this.hurtFlash = 0.6;
    this.addShake(8);
    this.hitStop = Math.max(this.hitStop, 0.035);
    this.addText(p.x, p.y - 96, '-' + dmg, '#ff6b6b', 20, false);
    bloodBurst(p.x, p.y - 40, dir, '#b9303a', 12);
    sfx.play('hurt');

    if (p.hp <= 0) {
      p.hp = 0;
      triggerPlayerDeath();
    }
  },

  spawnKnife(x, y, vx, vy, damage) {
    this.knives.push({
      x,
      y,
      vx,
      vy,
      damage,
      life: 0.95,
      rot: Math.atan2(vy, vx),
      dead: false
    });
  },

  /* 通用投射物(远程武器/箭塔):kind=knife|arrow|bolt|rang */
  spawnProj(x, y, vx, vy, damage, opts) {
    const o = opts || {};
    this.knives.push({
      x,
      y,
      vx,
      vy,
      damage,
      life: o.life || 1.1,
      rot: Math.atan2(vy, vx),
      dead: false,
      kind: o.kind || 'knife',
      pierce: !!o.pierce,
      returns: !!o.returns,
      dot: o.dot || null,
      hitList: (o.pierce || o.returns) ? new Set() : null,
      returning: false
    });
  },

  spawnBomb(x, y, vx, vy, fuse, radius, damage, team) {
    this.bombs.push({
      x,
      y,
      vx,
      vy,
      fuse,
      radius,
      damage,
      team: team || 'player',
      dead: false
    });
  },

  spawnShockwave(x, y, dir, damage, team) {
    this.waves.push({
      x,
      y: y !== undefined ? y : GROUND_Y,
      dir,
      damage,
      team: team || 'enemy',
      life: 1.05,
      maxLife: 1.05,
      hit: false,
      hitList: new Set()
    });
  },

  explode(x, y, radius, damage, team) {
    this.addShake(9);
    this.hitStop = Math.max(this.hitStop, 0.035);
    sfx.play('explode');

    for (let i = 0; i < 22; i++) {
      const a = rand(0, TAU);
      const sp = rand(80, 440);
      this.emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(0, 80),
        life: rand(0.22, 0.55),
        size: rand(1.6, 4.2),
        color: Math.random() < 0.5 ? 'rgba(255,190,90,0.95)' : 'rgba(255,245,210,0.95)',
        glow: true,
        type: 'spark',
        gravity: 500,
        drag: 1.4
      });
    }
    for (let i = 0; i < 12; i++) {
      this.emit({
        x: x + rand(-radius * 0.3, radius * 0.3),
        y: y + rand(-radius * 0.3, radius * 0.3),
        vx: rand(-110, 110),
        vy: rand(-160, -30),
        life: rand(0.4, 0.9),
        size: rand(6, 16),
        color: 'rgba(55,48,44,0.45)',
        gravity: -70,
        drag: 1.8,
        type: 'smoke'
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU);
      const sp = rand(120, 380);
      this.emit({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(60, 200),
        life: rand(0.4, 0.9),
        size: rand(2.5, 6),
        color: 'rgba(120,108,90,0.9)',
        gravity: 1500,
        drag: 0.4,
        type: 'rock',
        spin: rand(-14, 14)
      });
    }
    this.emit({
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.14,
      size: radius * 0.5,
      color: 'rgba(255,225,170,0.55)',
      glow: true
    });

    if (team === 'player') {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const cx = e.x;
        const cy = e.y - e.h * 0.5;
        const d = Math.hypot(cx - x, cy - y);
        if (d > radius + e.w * 0.35) continue;
        const falloff = 1 - clamp(d / (radius + e.w * 0.35), 0, 1) * 0.45;
        this.damageEnemy(e, damage * falloff, x, false, { knock: 320, ignoreBlock: true });
      }
    } else {
      const p = this.player;
      if (p && !p.dead) {
        const d = Math.hypot(p.x - x, (p.y - 38) - y);
        if (d < radius + 16) {
          this.hurtPlayer(damage * (1 - clamp(d / (radius + 16), 0, 1) * 0.4), x);
        }
      }
    }
  }
});

/* =========================================================
   投射物 / 掉落更新
   ========================================================= */
function updateKnives(game, dt) {
  const pl = game.player;
  for (let i = game.knives.length - 1; i >= 0; i--) {
    const k = game.knives[i];
    k.life -= dt;

    /* 回旋镖:半程后折返飞向玩家,折返时可再次命中 */
    if (k.returns && !k.returning && k.life <= 0.5 && pl && !pl.dead) {
      k.returning = true;
      if (k.hitList) k.hitList.clear();
    }
    if (k.returning && pl) {
      const dx = pl.x - k.x;
      const dy = (pl.y - 44) - k.y;
      const len = Math.hypot(dx, dy) || 1;
      const sp = Math.hypot(k.vx, k.vy) || 760;
      k.vx = approach(k.vx, (dx / len) * sp, 2600 * dt);
      k.vy = approach(k.vy, (dy / len) * sp, 2600 * dt);
      if (len < 30) { // 回到手中
        game.knives.splice(i, 1);
        continue;
      }
    }

    k.x += k.vx * dt;
    k.y += k.vy * dt;
    k.rot = k.returns ? (k.rot + 14 * dt) : Math.atan2(k.vy, k.vx);

    if (k.life <= 0 || k.x < -60 || k.x > game.level.width + 60 || k.y > GROUND_Y + 80) {
      game.knives.splice(i, 1);
      continue;
    }
    if (levelSolidAt(game.level, k.x, k.y)) {
      for (let n = 0; n < 5; n++) {
        game.emit({
          x: k.x,
          y: k.y,
          vx: rand(-90, 90),
          vy: rand(-130, 20),
          life: rand(0.12, 0.3),
          size: rand(1, 2),
          color: 'rgba(220,235,235,0.85)',
          glow: true,
          type: 'spark',
          gravity: 420,
          drag: 1.5
        });
      }
      game.knives.splice(i, 1);
      continue;
    }

    let consumed = false;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (k.hitList && k.hitList.has(e)) continue;
      if (!circleRect(k.x, k.y, 10, entityRect(e))) continue;
      game.damageEnemy(e, k.damage, k.x - signOf(k.vx) * 20, false, { knock: 170 });
      /* 投射物附带的持续效果(冰霜法杖等) */
      if (k.dot) applyDot(e, k.dot.type, k.dot.dps, k.dot.dur);
      if (k.pierce || k.returns) {
        k.hitList.add(e);
      } else {
        consumed = true;
      }
      break;
    }
    if (consumed) {
      game.knives.splice(i, 1);
    }
  }
}

function updateBombs(game, dt) {
  const pl = game.player;
  for (let i = game.bombs.length - 1; i >= 0; i--) {
    const b = game.bombs[i];
    b.fuse -= dt;

    /* 盾牌弹反:完美格挡窗口内把敌人手雷弹回去 */
    if (b.team === 'enemy' && pl && !pl.dead && pl.blockHeld) {
      const shield = (pl.gear.shield && SHIELD_MAP[pl.gear.shield.defId]) || SHIELD_MAP.woodshield;
      const d = Math.hypot(pl.x - b.x, (pl.y - 42) - b.y);
      if (d < 74 && pl.blockT <= shield.parry && signOf(b.x - pl.x) === pl.facing) {
        b.team = 'player';
        b.vx = -b.vx * 1.25;
        b.vy = Math.min(b.vy, -380);
        b.fuse = Math.max(b.fuse, 0.55);
        b.damage *= 1.4;
        pl.parryCrit = 3;
        game.hitStop = Math.max(game.hitStop, 0.06);
        game.addShake(4);
        game.addText(pl.x, pl.y - 100, '反弹!', '#9df3ff', 18, true);
        sfx.play('parry');
        for (let n = 0; n < 10; n++) {
          game.emit({
            x: b.x, y: b.y,
            vx: rand(-260, 260), vy: rand(-260, 60),
            life: rand(0.12, 0.3), size: rand(1.2, 2.6),
            color: 'rgba(160,240,255,0.95)', glow: true,
            type: 'spark', gravity: 500, drag: 1.4
          });
        }
        continue;
      }
    }

    b.vy += 2000 * dt;
    const prevY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.vy > 0) {
      for (const pf of game.level.platforms) {
        if (b.x < pf.x - 6 || b.x > pf.x + pf.w + 6) continue;
        if (prevY + 7 <= pf.y + 1 && b.y + 7 >= pf.y) {
          b.y = pf.y - 7;
          if (b.vy > 180) {
            b.vy = -b.vy * 0.4;
            b.vx *= 0.72;
          } else {
            b.vy = 0;
            b.vx *= 0.82;
          }
          break;
        }
      }
    }

    if (b.y > GROUND_Y + 80) {
      b.y = GROUND_Y + 80;
      b.vy = 0;
      b.vx *= 0.9;
    }

    if (b.fuse <= 0) {
      game.explode(b.x, b.y, b.radius, b.damage, b.team);
      game.bombs.splice(i, 1);
    }
  }
}

function updateWaves(game, dt) {
  for (let i = game.waves.length - 1; i >= 0; i--) {
    const w = game.waves[i];
    w.life -= dt;
    w.x += w.dir * 520 * dt;

    if (Math.random() < 0.75) {
      game.emit({
        x: w.x + rand(-8, 8),
        y: GROUND_Y - rand(0, 14),
        vx: -w.dir * rand(20, 90),
        vy: rand(-150, -30),
        life: rand(0.18, 0.42),
        size: rand(1.2, 2.8),
        color: Math.random() < 0.5 ? 'rgba(255,170,100,0.9)' : 'rgba(210,190,160,0.8)',
        glow: true,
        gravity: 700,
        drag: 1
      });
    }

    if (w.team === 'player') {
      /* 玩家冲击波(雷刃):命中每个敌人一次 */
      for (const e of game.enemies) {
        if (e.dead || w.hitList.has(e)) continue;
        if (Math.abs(e.x - w.x) < 46 && e.y > GROUND_Y - 170) {
          w.hitList.add(e);
          game.damageEnemy(e, w.damage, w.x - w.dir * 20, false, { knock: 240, ignoreBlock: true });
        }
      }
    } else if (!w.hit) {
      const p = game.player;
      if (p && !p.dead && Math.abs(p.x - w.x) < 34 && p.y > GROUND_Y - 140) {
        w.hit = true;
        game.hurtPlayer(w.damage, w.x - w.dir * 20);
      }
    }

    if (w.life <= 0 || w.x < -80 || w.x > game.level.width + 80) {
      game.waves.splice(i, 1);
    }
  }
}

function updatePickups(game, dt) {
  const p = game.player;
  for (let i = game.pickups.length - 1; i >= 0; i--) {
    const it = game.pickups[i];
    if (it.collected) {
      game.pickups.splice(i, 1);
      continue;
    }
    it.age += dt;

    /* 装备/图纸掉落物不自动吸附,停在原地等待 E 拾取 */
    const manual = it.type === 'item' || it.type === 'blueprint';

    if (!manual && p && !p.dead) {
      const tx = p.x;
      const ty = p.y - 40;
      const dx = tx - it.x;
      const dy = ty - it.y;
      const d = Math.hypot(dx, dy) || 1;
      const range = it.type === 'cell' ? 175 : 130;
      if (it.age > 0.28 && d < range) {
        const pull = 1500 * dt;
        it.vx += (dx / d) * pull;
        it.vy += (dy / d) * pull;
        it.vx *= 0.94;
        it.vy *= 0.94;
        if (d < 24) {
          collectPickup(game, it);
          continue;
        }
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        continue;
      }
    }

    const prevY = it.y;
    it.vy += 1500 * dt;
    it.x += it.vx * dt;
    it.y += it.vy * dt;

    if (it.vy > 0) {
      for (const pf of game.level.platforms) {
        if (it.x < pf.x - 4 || it.x > pf.x + pf.w + 4) continue;
        if (prevY + 6 <= pf.y + 1 && it.y + 6 >= pf.y) {
          it.y = pf.y - 6;
          it.vy = it.vy > 120 ? -it.vy * 0.35 : 0;
          it.vx *= 0.7;
          it.onGround = true;
          break;
        }
      }
    }

    if (it.y > GROUND_Y + 120) {
      game.pickups.splice(i, 1);
    }
  }
}
