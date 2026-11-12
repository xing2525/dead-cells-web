'use strict';

/* =========================================================
   物品实例 · 品质 · 词缀 · 掉落 · 装备应用
   ========================================================= */

/* ---------- 品质投掷:阶段越深,高品质概率越高 ---------- */
function rollRarity(stage) {
  const t = clamp((stage - 1) * 0.06, 0, 0.4);
  const r = Math.random();
  if (r < 0.02 + t * 0.35) return RARITY[3]; // 传说
  if (r < 0.10 + t * 0.8) return RARITY[2];  // 史诗
  if (r < 0.42 + t) return RARITY[1];        // 优秀
  return RARITY[0];                          // 普通
}

/* ---------- 词缀投掷:不重复 ---------- */
function rollAffixes(count) {
  const pool = AFFIXES.slice();
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const def = pool.splice(idx, 1)[0];
    out.push({ id: def.id, value: Math.round(rand(def.min, def.max)) });
  }
  return out;
}

/* ---------- 生成物品实例 ---------- */
let __itemUid = 0;
function makeItem(defId, kind, stage, rarityObj) {
  const rarity = rarityObj || rollRarity(stage || 1);
  const affixes = rollAffixes(rarity.affixes);
  const item = {
    uid: ++__itemUid,
    defId,
    kind,              // 'weapon' | 'shield' | 'skill' | 'amulet'
    rarity: rarity.id,
    affixes,
    level: 0           // 铁匠强化等级,伤害 +8%/级
  };
  applyAffixSum(item);
  return item;
}

function itemDef(item) {
  if (!item) return null;
  if (item.kind === 'weapon') return WEAPON_MAP[item.defId];
  if (item.kind === 'shield') return SHIELD_MAP[item.defId];
  if (item.kind === 'skill') return SKILL_MAP[item.defId];
  if (item.kind === 'amulet') return AMULET_MAP[item.defId];
  return null;
}

function itemRarity(item) {
  return RARITY.find((r) => r.id === item.rarity) || RARITY[0];
}

/* 词缀汇总到 item.sum,便于快速查询 */
function applyAffixSum(item) {
  const sum = {};
  for (const a of item.affixes || []) {
    sum[a.id] = (sum[a.id] || 0) + a.value;
  }
  item.sum = sum;
  return item;
}

/* 物品名称(带品质前缀) */
function itemName(item) {
  const def = itemDef(item);
  const r = itemRarity(item);
  if (!def) return '?';
  const lv = item.level > 0 ? ` +${item.level}` : '';
  return `${r.name}·${def.name}${lv}`;
}

/* 伤害倍率 = 品质倍率 × 强化 × 词缀 */
function itemDamageMul(item) {
  const r = itemRarity(item);
  let mul = r.mul * (1 + 0.08 * (item.level || 0));
  if (item.sum && item.sum.dmg) mul *= 1 + item.sum.dmg / 100;
  return mul;
}

/* ---------- 掉落池 ---------- */
/* 图纸解锁情况存 meta.blueprints[];未解锁的 blueprint 武器不掉落 */
function rollWeaponDefId(meta) {
  const unlocked = (meta && meta.blueprints) || [];
  const pool = WEAPON_DEFS.filter((w) => !w.blueprint || unlocked.includes(w.id));
  return choice(pool).id;
}

function rollSkillDefId() {
  return choice(SKILL_DEFS).id;
}

function rollAmuletDefId() {
  return choice(AMULET_DEFS).id;
}

/* 敌人掉落一件随机物品(武器/技能/护符) */
function rollItemDrop(game, x, y, forceKind) {
  const meta = game.meta || {};
  const diff = DIFFICULTY[game.bcLevel || 0];
  const stage = game.stage || 1;
  let kind = forceKind;
  if (!kind) {
    const r = Math.random();
    kind = r < 0.5 ? 'weapon' : (r < 0.8 ? 'skill' : 'amulet');
  }
  let defId;
  if (kind === 'weapon') defId = rollWeaponDefId(meta);
  else if (kind === 'skill') defId = rollSkillDefId();
  else if (kind === 'amulet') defId = rollAmuletDefId();
  else defId = choice(SHIELD_DEFS).id;
  const item = makeItem(defId, kind, stage + (diff.dropMul - 1) * 3);
  spawnPickup(game, 'item', x, y, 0, rand(-120, 120), rand(-420, -200)).item = item;
  return item;
}

/* 图纸掉落物(精英/Boss) */
function rollBlueprintDrop(game, x, y) {
  const meta = game.meta || {};
  const locked = WEAPON_DEFS.filter((w) => w.blueprint && !(meta.blueprints || []).includes(w.id));
  if (!locked.length) return null;
  const def = choice(locked);
  const pk = spawnPickup(game, 'blueprint', x, y, 0, rand(-100, 100), rand(-380, -180));
  pk.blueprintId = def.id;
  return def;
}

/* ---------- 装备应用(玩家) ---------- */
/* 计算玩家装备提供的属性加成 */
function gearBonus(player) {
  const bonus = { hp: 0, crit: 0, speed: 0, greed: 0, cd: 0, cells: 0, frost: 0, knock: 0, bleed: 0, burn: 0, poison: 0, dmg: 0 };
  const add = (sum) => {
    if (!sum) return;
    bonus.hp += sum.hp || 0;
    bonus.crit += (sum.crit || 0) / 100;
    bonus.speed += (sum.speed || 0) / 100;
    bonus.greed += (sum.greed || 0) / 100;
    bonus.cells += (sum.cells || 0) / 100;
    bonus.cd += (sum.cd || 0) / 100;
    bonus.frost += sum.frost || 0;
    bonus.knock += (sum.knock || 0) / 100;
    bonus.bleed += sum.bleed || 0;
    bonus.burn += sum.burn || 0;
    bonus.poison += sum.poison || 0;
    bonus.dmg += (sum.dmg || 0) / 100;
  };
  for (const key of ['weaponA', 'weaponB', 'skill1', 'skill2']) {
    if (player.gear && player.gear[key]) add(player.gear[key].sum);
  }
  const am = player.gear && player.gear.amulet;
  if (am) {
    const def = AMULET_MAP[am.defId];
    if (def) {
      if (def.hpMul) bonus.hpMul = (bonus.hpMul || 0) + def.hpMul;
      if (def.crit) bonus.crit += def.crit;
      if (def.speed) bonus.speed += def.speed;
      if (def.greed) bonus.greed += def.greed;
    }
    add(am.sum);
  }
  return bonus;
}

/* 决定物品装入哪个槽位(武器先填副手,再替换当前主手;技能先空格,满则换 skill1) */
function equipSlotFor(player, item) {
  const kind = item.kind;
  if (kind === 'weapon') {
    if (!player.gear.weaponB) return 'weaponB';
    return player.activeSlot || 'weaponA';
  }
  if (kind === 'shield') return 'shield';
  if (kind === 'skill') {
    if (!player.gear.skill1) return 'skill1';
    if (!player.gear.skill2) return 'skill2';
    return 'skill1';
  }
  return 'amulet';
}

/* 装备到槽位,返回被替换下的旧装备(可能为 null) */
function equipItem(player, item) {
  if (!player.gear) return null;
  const slot = equipSlotFor(player, item);
  const old = player.gear[slot] || null;
  player.gear[slot] = item;
  if (item.kind === 'skill') player.resetSkillState(slot);
  if (slot === player.activeSlot) player.onWeaponChanged && player.onWeaponChanged();
  player.refreshGearStats();
  return old;
}

/* 把物品丢回地面(换装替换下来的旧装备) */
function dropItemPickup(game, item, x, y) {
  const pk = spawnPickup(game, 'item', x, y - 16, 0, rand(-70, 70), -240);
  if (pk) pk.item = item;
}
