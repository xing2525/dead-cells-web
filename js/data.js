'use strict';

/* =========================================================
   数据驱动层 · 全部玩法数值表
   新增武器/敌人/变异 = 往对应 DEF 表加一条即可
   ========================================================= */

/* ---------- 品质 ---------- */
const RARITY = [
  { id: 'common',    name: '普通', color: '#b8c4c6', affixes: 0, mul: 1.0 },
  { id: 'fine',      name: '优秀', color: '#6fd48a', affixes: 1, mul: 1.15 },
  { id: 'epic',      name: '史诗', color: '#c79bff', affixes: 2, mul: 1.35 },
  { id: 'legendary', name: '传说', color: '#ffb84d', affixes: 3, mul: 1.6 }
];

/* ---------- 三色属性 ---------- */
const STATS = {
  brutality: { id: 'brutality', name: '暴虐', color: '#e2545a', desc: '近战与暴虐武器伤害 +15%/级' },
  tactics:   { id: 'tactics',   name: '战术', color: '#6fc3e2', desc: '远程与战术武器伤害 +15%/级' },
  survival:  { id: 'survival',  name: '生存', color: '#8ae37f', desc: '生存武器伤害 +15%/级,最大生命 +12%/级' }
};

/* ---------- 通用词缀 ---------- */
const AFFIXES = [
  { id: 'dmg',   name: '锐利',   desc: '伤害提升',       min: 8,  max: 18, fmt: (v) => `伤害 +${v}%` },
  { id: 'crit',  name: '致命',   desc: '暴击率提升',     min: 4,  max: 10, fmt: (v) => `暴击率 +${v}%` },
  { id: 'bleed', name: '放血',   desc: '命中附加流血',   min: 6,  max: 14, fmt: (v) => `命中附加 ${v}/秒 流血,持续 3 秒` },
  { id: 'burn',  name: '灼烧',   desc: '命中附加燃烧',   min: 6,  max: 14, fmt: (v) => `命中附加 ${v}/秒 燃烧,持续 3 秒` },
  { id: 'frost', name: '寒霜',   desc: '命中减速敌人',   min: 20, max: 40, fmt: (v) => `命中减速 ${v}%,持续 2 秒` },
  { id: 'knock', name: '击退',   desc: '击退增强',       min: 25, max: 60, fmt: (v) => `击退 +${v}%` },
  { id: 'hp',    name: '活力',   desc: '最大生命提升',   min: 10, max: 25, fmt: (v) => `最大生命 +${v}` },
  { id: 'cd',    name: '迅捷',   desc: '技能冷却缩减',   min: 8,  max: 16, fmt: (v) => `技能冷却 -${v}%` },
  { id: 'greed', name: '贪婪',   desc: '金币获取提升',   min: 15, max: 35, fmt: (v) => `金币 +${v}%` },
  { id: 'cells', name: '汲取',   desc: '细胞获取提升',   min: 15, max: 35, fmt: (v) => `细胞 +${v}%` },
  { id: 'poison',name: '淬毒',   desc: '命中附加中毒',   min: 5,  max: 12, fmt: (v) => `命中附加 ${v}/秒 中毒,持续 4 秒` },
  { id: 'speed', name: '疾风',   desc: '攻速提升',       min: 6,  max: 12, fmt: (v) => `攻击速度 +${v}%` }
];
const AFFIX_MAP = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

/* ---------- 武器 ----------
   combo 元素结构: {dur,active,damage,range,height,angleFrom,angleTo,lunge}
   kind: melee(近战) / ranged(远程)
   stat: brutality / tactics / survival(吃对应属性加成)
   dot: {type:'burn'|'bleed'|'poison', dps, dur} 命中附加持续伤害
   stun: 命中眩晕秒数; wave: 命中发出冲击波; ammo/regen/projSpeed: 远程参数 */
const WEAPON_DEFS = [
  {
    id: 'balanced', name: '均衡之刃', kind: 'melee', stat: 'brutality',
    desc: '制式军刀,攻守平衡的老伙计。', crit: 0.08, blueprint: false,
    combo: [
      { dur: 0.3, active: 0.075, damage: 21, range: 94,  height: 68, angleFrom: -2.05, angleTo: 0.7,  lunge: 70 },
      { dur: 0.3, active: 0.07,  damage: 21, range: 94,  height: 68, angleFrom: 0.85,  angleTo: -1.7, lunge: 60 },
      { dur: 0.4, active: 0.11,  damage: 38, range: 118, height: 78, angleFrom: -2.6,  angleTo: 1.0,  lunge: 110 }
    ]
  },
  {
    id: 'twinblades', name: '双刃', kind: 'melee', stat: 'brutality',
    desc: '成对的短刀,第三击后连绵不绝。', crit: 0.12, blueprint: false,
    combo: [
      { dur: 0.24, active: 0.06, damage: 13, range: 82, height: 62, angleFrom: -2.0,  angleTo: 0.6,  lunge: 55 },
      { dur: 0.24, active: 0.06, damage: 13, range: 82, height: 62, angleFrom: 0.8,   angleTo: -1.6, lunge: 55 },
      { dur: 0.26, active: 0.07, damage: 16, range: 86, height: 66, angleFrom: -2.2,  angleTo: 0.9,  lunge: 70 },
      { dur: 0.3,  active: 0.08, damage: 24, range: 96, height: 70, angleFrom: -2.5,  angleTo: 1.1,  lunge: 95 }
    ]
  },
  {
    id: 'greatsword', name: '巨剑', kind: 'melee', stat: 'survival',
    desc: '缓慢而沉重,一剑开山。', crit: 0.1, blueprint: false,
    combo: [
      { dur: 0.52, active: 0.16, damage: 52, range: 128, height: 92, angleFrom: -2.3, angleTo: 0.8,  lunge: 60 },
      { dur: 0.58, active: 0.18, damage: 68, range: 136, height: 96, angleFrom: 0.9,  angleTo: -2.4, lunge: 80 }
    ]
  },
  {
    id: 'spear', name: '长枪', kind: 'melee', stat: 'brutality',
    desc: '一寸长一寸强,保持距离的艺术。', crit: 0.1, blueprint: true,
    combo: [
      { dur: 0.32, active: 0.09, damage: 24, range: 148, height: 44, angleFrom: -1.85, angleTo: 0.15, lunge: 90 },
      { dur: 0.36, active: 0.1,  damage: 30, range: 156, height: 46, angleFrom: -1.75, angleTo: 0.1,  lunge: 120 }
    ]
  },
  {
    id: 'dagger', name: '匕首', kind: 'melee', stat: 'brutality',
    desc: '快如闪电,第三击直取要害。', crit: 0.22, blueprint: false,
    combo: [
      { dur: 0.2,  active: 0.05, damage: 11, range: 72, height: 56, angleFrom: -1.9, angleTo: 0.5,  lunge: 70 },
      { dur: 0.2,  active: 0.05, damage: 11, range: 72, height: 56, angleFrom: 0.7,  angleTo: -1.5, lunge: 70 },
      { dur: 0.26, active: 0.06, damage: 26, range: 80, height: 60, angleFrom: -2.2, angleTo: 0.9,  lunge: 110 }
    ]
  },
  {
    id: 'torch', name: '火炬', kind: 'melee', stat: 'brutality',
    desc: '点燃敌人,照亮回廊。', crit: 0.06, blueprint: true,
    dot: { type: 'burn', dps: 9, dur: 3 },
    combo: [
      { dur: 0.34, active: 0.09, damage: 17, range: 92, height: 66, angleFrom: -2.0, angleTo: 0.6,  lunge: 65 },
      { dur: 0.38, active: 0.1,  damage: 24, range: 98, height: 70, angleFrom: 0.8,  angleTo: -1.8, lunge: 85 }
    ]
  },
  {
    id: 'mace', name: '钉锤', kind: 'melee', stat: 'survival',
    desc: '沉重的钝器,打得敌人眼冒金星。', crit: 0.08, stun: 0.9, blueprint: true,
    combo: [
      { dur: 0.46, active: 0.13, damage: 38, range: 104, height: 80, angleFrom: -2.2, angleTo: 0.7, lunge: 55 },
      { dur: 0.5,  active: 0.15, damage: 48, range: 108, height: 84, angleFrom: 0.9,  angleTo: -2.2, lunge: 70 }
    ]
  },
  {
    id: 'bonesaw', name: '骨锯', kind: 'melee', stat: 'brutality',
    desc: '锯齿撕扯血肉,伤口难以愈合。', crit: 0.1, blueprint: true,
    dot: { type: 'bleed', dps: 11, dur: 3 },
    combo: [
      { dur: 0.28, active: 0.07, damage: 16, range: 90, height: 64, angleFrom: -2.0, angleTo: 0.6,  lunge: 60 },
      { dur: 0.28, active: 0.07, damage: 16, range: 90, height: 64, angleFrom: 0.8,  angleTo: -1.7, lunge: 60 },
      { dur: 0.34, active: 0.09, damage: 26, range: 96, height: 68, angleFrom: -2.3, angleTo: 0.9,  lunge: 85 }
    ]
  },
  {
    id: 'warbow', name: '战弓', kind: 'ranged', stat: 'tactics',
    desc: '精准而致命的远程打击。', crit: 0.15, blueprint: false,
    ammo: 6, regen: 1.2, projSpeed: 1150, projDamage: 26, attackDur: 0.42
  },
  {
    id: 'froststaff', name: '冰霜法杖', kind: 'ranged', stat: 'tactics',
    desc: '凝结寒气的法杖,迟滞一切活物。', crit: 0.08, blueprint: true,
    ammo: 8, regen: 0.9, projSpeed: 880, projDamage: 18, attackDur: 0.36,
    dot: { type: 'frost', dps: 0, dur: 2, slow: 0.45 }
  },
  {
    id: 'boomerang', name: '回旋镖', kind: 'ranged', stat: 'tactics',
    desc: '飞去来兮,来回切割路径上的敌人。', crit: 0.1, blueprint: true,
    ammo: 2, regen: 1.4, projSpeed: 760, projDamage: 30, attackDur: 0.4, pierce: true, returns: true
  },
  {
    id: 'thunderblade', name: '雷刃', kind: 'melee', stat: 'brutality',
    desc: '缠绕雷电的利刃,挥出冲击波。', crit: 0.12, wave: true, blueprint: true,
    combo: [
      { dur: 0.3,  active: 0.08, damage: 22, range: 96,  height: 68, angleFrom: -2.0, angleTo: 0.7,  lunge: 70 },
      { dur: 0.3,  active: 0.08, damage: 22, range: 96,  height: 68, angleFrom: 0.85, angleTo: -1.7, lunge: 70 },
      { dur: 0.42, active: 0.12, damage: 40, range: 120, height: 80, angleFrom: -2.6, angleTo: 1.0,  lunge: 115 }
    ]
  },
  /* ---------- 后续扩充武器(全部可在营地武器栏选择) ---------- */
  {
    id: 'twinaxes', name: '双斧', kind: 'melee', stat: 'brutality',
    desc: '两把短斧交替劈砍,第四击撕裂。', crit: 0.12, blueprint: false,
    combo: [
      { dur: 0.26, active: 0.07, damage: 15, range: 84,  height: 64, angleFrom: -2.1,  angleTo: 0.6,  lunge: 60 },
      { dur: 0.26, active: 0.07, damage: 15, range: 84,  height: 64, angleFrom: 0.8,   angleTo: -1.7, lunge: 60 },
      { dur: 0.26, active: 0.07, damage: 17, range: 88,  height: 66, angleFrom: -2.2,  angleTo: 0.8,  lunge: 65 },
      { dur: 0.34, active: 0.1,  damage: 28, range: 100, height: 72, angleFrom: -2.6,  angleTo: 1.1,  lunge: 100 }
    ]
  },
  {
    id: 'flail', name: '链枷', kind: 'melee', stat: 'brutality',
    desc: '铁链甩出的重锤,击退极强。', crit: 0.1, knock: true, blueprint: false,
    combo: [
      { dur: 0.4, active: 0.12, damage: 34, range: 112, height: 78, angleFrom: -2.4, angleTo: 0.9, lunge: 70 },
      { dur: 0.46, active: 0.14, damage: 44, range: 120, height: 82, angleFrom: 1.0,  angleTo: -2.5, lunge: 85 }
    ]
  },
  {
    id: 'warhammer', name: '战锤', kind: 'melee', stat: 'survival',
    desc: '蓄力砸地,连大地都在颤抖。', crit: 0.08, stun: 1.2, blueprint: false,
    combo: [
      { dur: 0.62, active: 0.2,  damage: 62, range: 112, height: 92, angleFrom: -2.5, angleTo: 1.0, lunge: 55 },
      { dur: 0.7,  active: 0.24, damage: 82, range: 122, height: 96, angleFrom: 1.1,  angleTo: -2.6, lunge: 65 }
    ]
  },
  {
    id: 'frostgreatsword', name: '霜巨剑', kind: 'melee', stat: 'survival',
    desc: '巨剑裹霜,命中迟滞敌人。', crit: 0.1, blueprint: true,
    dot: { type: 'frost', dps: 0, dur: 2, slow: 0.45 },
    combo: [
      { dur: 0.5,  active: 0.16, damage: 46, range: 122, height: 88, angleFrom: -2.3, angleTo: 0.8, lunge: 60 },
      { dur: 0.56, active: 0.18, damage: 60, range: 130, height: 92, angleFrom: 0.9,  angleTo: -2.4, lunge: 75 }
    ]
  },
  {
    id: 'firestaff', name: '火焰法杖', kind: 'ranged', stat: 'tactics',
    desc: '喷出一团烈焰,点燃路径上的敌人。', crit: 0.08, blueprint: true,
    ammo: 5, regen: 1.1, projSpeed: 700, projDamage: 22, attackDur: 0.4,
    dot: { type: 'burn', dps: 10, dur: 3 }
  },
  {
    id: 'heavycrossbow', name: '重弩', kind: 'ranged', stat: 'tactics',
    desc: '装填缓慢,一箭穿透整列敌人。', crit: 0.14, blueprint: false,
    ammo: 3, regen: 1.6, projSpeed: 1400, projDamage: 48, attackDur: 0.55, pierce: true
  }
];
const WEAPON_MAP = Object.fromEntries(WEAPON_DEFS.map((w) => [w.id, w]));

/* ---------- 盾牌 ---------- */
const SHIELD_DEFS = [
  { id: 'woodshield',  name: '木盾',   reduce: 0.55, parry: 0.15, desc: '随处可见的简易盾牌。', reflect: false, parryStun: 1.0 },
  { id: 'ironshield',  name: '铁壁盾', reduce: 0.7,  parry: 0.15, desc: '厚重铁盾,格挡如山。',   reflect: true,  parryStun: 1.2 },
  { id: 'spikeshield', name: '荆棘盾', reduce: 0.6,  parry: 0.18, desc: '格挡时反刺攻击者。',     reflect: true,  parryStun: 1.2, thorns: 14 }
];
const SHIELD_MAP = Object.fromEntries(SHIELD_DEFS.map((s) => [s.id, s]));

/* ---------- 技能 ----------
   kind: proj(投射) / bomb(爆炸) / nova(新星) / turret(箭塔) / heal(治疗) / smoke(烟雾) / hook(钩爪) / thunder(落雷) */
const SKILL_DEFS = [
  { id: 'knife',     name: '飞刀',     kind: 'proj',    cd: 0.32, charges: 5, regen: 1.7, damage: 16, desc: '五连飞刀,自动补充。' },
  { id: 'grenade',   name: '手雷',     kind: 'bomb',    cd: 7,    charges: 1, damage: 58, radius: 112, desc: '范围爆炸伤害。' },
  { id: 'frostnova', name: '冰霜新星', kind: 'nova',    cd: 9,    charges: 1, damage: 22, radius: 190, freeze: 2.2, desc: '冻结周围敌人。' },
  { id: 'turret',    name: '弩箭塔',   kind: 'turret',  cd: 14,   charges: 1, damage: 9,  dur: 8, range: 460, desc: '部署一座自动弩塔。' },
  { id: 'smoke',     name: '烟雾弹',   kind: 'smoke',   cd: 10,   charges: 1, dur: 3.5,  desc: '隐匿身形,敌人丢失目标。' },
  { id: 'thunder',   name: '落雷',     kind: 'thunder', cd: 11,   charges: 1, damage: 46, radius: 130, desc: '召唤天雷轰击前方。' },
  { id: 'heal',      name: '治疗术',   kind: 'heal',    cd: 18,   charges: 1, heal: 30,  desc: '恢复生命,战局中喘口气。' },
  { id: 'hook',      name: '钩爪',     kind: 'hook',    cd: 6,    charges: 1, damage: 18, range: 420, stun: 1.2, desc: '把远处敌人拽到面前。' }
];
const SKILL_MAP = Object.fromEntries(SKILL_DEFS.map((s) => [s.id, s]));

/* ---------- 护符 ---------- */
const AMULET_DEFS = [
  { id: 'am_hp',    name: '生命之符', desc: '最大生命 +25%',       hpMul: 0.25 },
  { id: 'am_crit',  name: '锐利之符', desc: '暴击率 +10%',          crit: 0.1 },
  { id: 'am_speed', name: '疾行之符', desc: '移动速度 +12%',        speed: 0.12 },
  { id: 'am_greed', name: '贪婪之符', desc: '金币与细胞获取 +25%',  greed: 0.25 }
];
const AMULET_MAP = Object.fromEntries(AMULET_DEFS.map((a) => [a.id, a]));

/* ---------- 精英词缀 ---------- */
const ELITE_AFFIXES = [
  { id: 'teleport', name: '传送', color: '#c79bff', desc: '周期性瞬移到玩家身后' },
  { id: 'barrier',  name: '护盾', color: '#6fc3e2', desc: '开局带一层吸收伤害的护盾' },
  { id: 'rage',     name: '狂暴', color: '#e2545a', desc: '生命低于 50% 时攻速移速大增' },
  { id: 'venom',    name: '毒雾', color: '#8ae37f', desc: '周身散发毒雾,持续侵蚀' }
];
const ELITE_AFFIX_MAP = Object.fromEntries(ELITE_AFFIXES.map((a) => [a.id, a]));

/* ---------- 变异(每区三选一,最多 3 个,死亡清零) ---------- */
const MUTATIONS = [
  { id: 'combo',      name: '连击大师', icon: '⚔', desc: '连击终结段伤害 +50%' },
  { id: 'bloodthirst',name: '嗜血',     icon: '🩸', desc: '击杀回复 4 点生命' },
  { id: 'swift',      name: '迅捷',     icon: '💨', desc: '移动速度 +15%' },
  { id: 'acrobat',    name: '杂技',     icon: '🌀', desc: '翻滚冷却 -35%' },
  { id: 'sniper',     name: '狙击手',   icon: '🎯', desc: '远程伤害 +25%' },
  { id: 'brawler',    name: '斗士',     icon: '👊', desc: '近战伤害 +20%' },
  { id: 'thorns',     name: '荆棘',     icon: '🌵', desc: '受击反弹 12 点伤害' },
  { id: 'greed',      name: '贪婪',     icon: '💰', desc: '金币获取 +50%' },
  { id: 'cellular',   name: '细胞亲和', icon: '🧬', desc: '细胞获取 +30%' },
  { id: 'secondwind', name: '回光返照', icon: '🔥', desc: '每个区域一次:致命伤害保留 1 点生命' },
  { id: 'pyro',       name: '纵火狂',   icon: '🔥', desc: '燃烧伤害 +60%' },
  { id: 'medic',      name: '医疗兵',   icon: '💊', desc: '药水回复量 +50%' },
  { id: 'assassin',   name: '刺客',     icon: '🗡', desc: '从背后攻击时伤害 +40%' },
  { id: 'bulwark',    name: '壁垒',     icon: '🛡', desc: '最大生命 +30,但翻滚距离 -10%' }
];
const MUTATION_MAP = Object.fromEntries(MUTATIONS.map((m) => [m.id, m]));

/* ---------- 敌人生态(单表驱动,阶段6扩容至12+) ---------- */
/* ai: husk(冲锋) / shield(盾卫) / grenadier(掷弹) / bat(袭扰) /
       dasher(突进) / bomber(自爆) / summoner(召唤) / lurker(隐身) / boss(领主) */
const ENEMY_DEFS = [
  { id: 'husk',      name: '囚徒',     ai: 'husk',      w: 42, h: 66, hp: 52, damage: 11, minTier: 1 },
  { id: 'shield',    name: '盾卫',     ai: 'shield',    w: 48, h: 72, hp: 96, damage: 16, minTier: 1 },
  { id: 'grenadier', name: '掷弹兵',   ai: 'grenadier', w: 38, h: 62, hp: 46, damage: 8,  minTier: 1 },
  { id: 'bat',       name: '腐翼',     ai: 'bat',       w: 46, h: 30, hp: 26, damage: 9,  minTier: 1 },
  { id: 'dasher',    name: '疾行刺客', ai: 'dasher',    w: 36, h: 60, hp: 40, damage: 13, minTier: 2 },
  { id: 'bomber',    name: '爆裂者',   ai: 'bomber',    w: 40, h: 58, hp: 34, damage: 26, minTier: 2 },
  { id: 'summoner',  name: '唤魂师',   ai: 'summoner',  w: 40, h: 66, hp: 58, damage: 8,  minTier: 3 },
  { id: 'lurker',    name: '隐匿者',   ai: 'lurker',    w: 38, h: 64, hp: 48, damage: 15, minTier: 3 },
  { id: 'brute',     name: '蛮兵',     ai: 'husk',      w: 56, h: 84, hp: 130, damage: 18, minTier: 3, heavy: true },
  { id: 'spitter',   name: '吐酸者',   ai: 'grenadier', w: 40, h: 60, hp: 44, damage: 10, minTier: 2, acid: true },
  { id: 'warden',    name: '狱法师',   ai: 'summoner',  w: 42, h: 70, hp: 72, damage: 12, minTier: 4 },
  { id: 'kingblade', name: '王者之刃', ai: 'dasher',    w: 44, h: 74, hp: 110, damage: 20, minTier: 4, heavy: true },
  { id: 'boss',      name: '狱卒',     ai: 'boss',      w: 118, h: 158, hp: 620, damage: 22, minTier: 1 }
];
const ENEMY_MAP = Object.fromEntries(ENEMY_DEFS.map((e) => [e.id, e]));

/* ---------- 生物群系 ---------- */
/* theme 复用/扩展 level.js 的 THEMES 结构; next 为可选后续群系 */
const BIOMES = [
  {
    id: 'prison', name: '被囚者的牢房', en: "PRISONERS' QUARTERS", tier: 1,
    next: ['sewers', 'clocktower'], boss: 'jailor',
    theme: {
      skyTop: '#050d13', skyBottom: '#0f2b34', moon: '#d3eef1', far: '#0a1a22', mid: '#07141a',
      stoneLight: '#4a6a74', stone: '#27414a', stoneDark: '#14242b', edge: '#7fb0b8', moss: '#2e5a4b',
      fog: 'rgba(118,198,208,0.055)', accent: '#6fe8ea', accentSoft: 'rgba(111,232,234,0.16)',
      torch: '#ffb168', torchGlow: 'rgba(255,158,82,0.32)'
    }
  },
  {
    id: 'sewers', name: '腐化下水道', en: 'CORRUPTED SEWERS', tier: 2,
    next: ['graveyard', 'clocktower'],
    theme: {
      skyTop: '#040e09', skyBottom: '#0d291b', moon: '#c6f0d4', far: '#0a1a12', mid: '#06120d',
      stoneLight: '#4a6a50', stone: '#27402f', stoneDark: '#112218', edge: '#7dae87', moss: '#3e7a4a',
      fog: 'rgba(118,226,150,0.055)', accent: '#8ae37f', accentSoft: 'rgba(138,227,127,0.16)',
      torch: '#b8ff9c', torchGlow: 'rgba(130,230,140,0.28)'
    }
  },
  {
    id: 'clocktower', name: '钟楼残骸', en: 'CLOCK TOWER RUINS', tier: 2,
    next: ['graveyard', 'throne'], boss: 'warden',
    theme: {
      skyTop: '#0a0715', skyBottom: '#241b3a', moon: '#e8d8ff', far: '#150f22', mid: '#0d0a17',
      stoneLight: '#5a4c76', stone: '#352c4a', stoneDark: '#191424', edge: '#a58cc4', moss: '#4a3a66',
      fog: 'rgba(190,150,255,0.05)', accent: '#c79bff', accentSoft: 'rgba(199,155,255,0.16)',
      torch: '#ff9bd2', torchGlow: 'rgba(220,120,255,0.28)'
    }
  },
  {
    id: 'graveyard', name: '无铭墓园', en: 'NAMELESS GRAVEYARD', tier: 3,
    next: ['throne'],
    theme: {
      skyTop: '#070b08', skyBottom: '#1a2420', moon: '#d8e8dc', far: '#0c1410', mid: '#080f0b',
      stoneLight: '#5a6a62', stone: '#2e3e36', stoneDark: '#131c17', edge: '#8fae9f', moss: '#3a5a48',
      fog: 'rgba(160,200,180,0.05)', accent: '#a8e8c8', accentSoft: 'rgba(168,232,200,0.14)',
      torch: '#d8f0a8', torchGlow: 'rgba(190,230,140,0.26)'
    }
  },
  {
    id: 'throne', name: '无间王座', en: 'THRONE OF THE ENDLESS', tier: 4,
    next: [], boss: 'king',
    theme: {
      skyTop: '#120708', skyBottom: '#2a1216', moon: '#f0d8d0', far: '#1a0c0e', mid: '#100709',
      stoneLight: '#6a4a48', stone: '#3e2828', stoneDark: '#1c1213', edge: '#b88a86', moss: '#5a3236',
      fog: 'rgba(220,140,130,0.05)', accent: '#f0a898', accentSoft: 'rgba(240,168,152,0.15)',
      torch: '#ffb168', torchGlow: 'rgba(255,140,82,0.3)'
    }
  }
];
const BIOME_MAP = Object.fromEntries(BIOMES.map((b) => [b.id, b]));

/* ---------- 难度层级(Boss 细胞 0~5) ---------- */
const DIFFICULTY = [
  { cells: 0, name: '普通',   enemyHp: 1.0,  enemyDmg: 1.0,  density: 1.0,  eliteRate: 0.04, dropMul: 1.0,  cellRetain: 0 },
  { cells: 1, name: '困难',   enemyHp: 1.25, enemyDmg: 1.15, density: 1.15, eliteRate: 0.08, dropMul: 1.1,  cellRetain: 0.1 },
  { cells: 2, name: '专家',   enemyHp: 1.5,  enemyDmg: 1.3,  density: 1.3,  eliteRate: 0.12, dropMul: 1.2,  cellRetain: 0.2 },
  { cells: 3, name: '大师',   enemyHp: 1.8,  enemyDmg: 1.5,  density: 1.45, eliteRate: 0.17, dropMul: 1.35, cellRetain: 0.3 },
  { cells: 4, name: '噩梦',   enemyHp: 2.2,  enemyDmg: 1.75, density: 1.6,  eliteRate: 0.22, dropMul: 1.5,  cellRetain: 0.4 },
  { cells: 5, name: '无间',   enemyHp: 2.6,  enemyDmg: 2.0,  density: 1.8,  eliteRate: 0.28, dropMul: 1.7,  cellRetain: 0.5 }
];

/* ---------- 疫病潮汐(原创机制A) ---------- */
const TIDE_CFG = {
  baseRate: 0.35,     // 每秒自然增长
  killBonus: 1,       // 每次击杀额外
  threshold: 60,      // 触发阈值
  tideDur: 12,        // 潮汐持续秒数
  enemySpeed: 1.4,    // 敌移速/攻速倍率
  enemyDmg: 1.25,     // 敌伤害倍率
  dropMul: 2,         // 掉落倍率
  eliteBonus: 0.2,    // 精英率加成
  purgeCellCost: 15,  // 净化祭坛:细胞
  purgeGoldCost: 30,  // 净化祭坛:金币
  purgePause: 20      // 净化后暂停增长秒数
};

/* ---------- 回响遗产(原创机制B) ---------- */
const ECHO_CFG = {
  qualityByDeaths: [    // 按累计死亡数决定残片品质
    { min: 0, rarity: 'common' },
    { min: 3, rarity: 'fine' },
    { min: 6, rarity: 'epic' }
  ]
};
