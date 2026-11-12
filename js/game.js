'use strict';

/* =========================================================
   游戏主控
   ========================================================= */
const META_KEY = 'deadcells_proto_meta_v2';
const META_DEFAULT = {
  cells: 0,
  up: { hp: 0, power: 0, potion: 0, agility: 0 },
  blueprints: [],
  best: 1,
  runs: 0,
  kills: 0
};

const UPGRADES = [
  { id: 'hp', name: '生命强化', desc: '最大生命值 +20', max: 3, costs: [6, 12, 20] },
  { id: 'power', name: '力量强化', desc: '所有伤害 +10%', max: 3, costs: [8, 16, 26] },
  { id: 'potion', name: '药水扩容', desc: '携带药水 +1', max: 2, costs: [10, 18] },
  { id: 'agility', name: '轻盈之靴', desc: '解锁空中三段跳', max: 1, costs: [15] }
];

const STEP = 1 / 60;

const game = {
  state: 'menu',
  canvas: null,
  ctx: null,
  dpr: 1,
  cssW: 0,
  cssH: 0,
  scale: 1,
  viewW: 1280,
  keys: {},
  meta: null,
  level: null,
  player: null,
  enemies: [],
  knives: [],
  bombs: [],
  waves: [],
  turrets: [],
  smokeT: 0,
  pickups: [],
  particles: [],
  texts: [],
  cam: { x: 0, sx: 0, sy: 0 },
  time: 0,
  stage: 1,
  run: { gold: 0, cells: 0, kills: 0 },
  hitStop: 0,
  hurtFlash: 0,
  shake: 0,
  transition: null,
  intro: null,
  toast: null,
  nearDoor: false,
  choice: null,
  /* 疫病潮汐 */
  infection: 0,
  tideActive: false,
  tideT: 0,
  purgePause: 0,
  /* 回响遗产 */
  echoChest: null,
  dyingT: 0,
  dyingAlpha: 0,
  muted: false,
  emberAcc: 0
};

let lastTime = 0;
let accumulator = 0;

/* =========================================================
   存档与商店
   ========================================================= */
function loadMeta() {
  const stored = storage.get(META_KEY, null);
  if (!stored) {
    return JSON.parse(JSON.stringify(META_DEFAULT));
  }
  const up = Object.assign({}, META_DEFAULT.up, stored.up || {});
  return {
    cells: Math.max(0, Math.floor(Number(stored.cells) || 0)),
    up: {
      hp: clamp(Math.floor(Number(up.hp) || 0), 0, 3),
      power: clamp(Math.floor(Number(up.power) || 0), 0, 3),
      potion: clamp(Math.floor(Number(up.potion) || 0), 0, 2),
      agility: clamp(Math.floor(Number(up.agility) || 0), 0, 1)
    },
    best: Math.max(1, Math.floor(Number(stored.best) || 1)),
    runs: Math.max(0, Math.floor(Number(stored.runs) || 0)),
    kills: Math.max(0, Math.floor(Number(stored.kills) || 0)),
    blueprints: Array.isArray(stored.blueprints) ? stored.blueprints.slice() : []
  };
}

function saveMeta() {
  storage.set(META_KEY, game.meta);
}

function updateMetaUI() {
  if (!game.meta) return;
  const cellsEl = document.getElementById('menu-cells');
  const bestEl = document.getElementById('menu-best');
  const runsEl = document.getElementById('menu-runs');
  const bankEl = document.getElementById('death-bank');
  if (cellsEl) cellsEl.textContent = game.meta.cells;
  if (bestEl) bestEl.textContent = game.meta.best;
  if (runsEl) runsEl.textContent = game.meta.runs;
  if (bankEl) bankEl.textContent = game.meta.cells;
}

function renderShopInto(el) {
  if (!el || !game.meta) return;
  el.innerHTML = '';
  for (const up of UPGRADES) {
    const lvl = game.meta.up[up.id] || 0;
    const maxed = lvl >= up.max;
    const cost = maxed ? 0 : up.costs[lvl];
    const affordable = game.meta.cells >= cost;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'upgrade' + (maxed ? ' maxed' : '');
    btn.disabled = maxed || !affordable;
    btn.innerHTML =
      '<span class="up-main">' +
        '<span class="up-name">' + up.name + '</span>' +
        '<span class="up-desc">' + up.desc + '</span>' +
      '</span>' +
      '<span class="up-meta">' +
        '<span class="up-lv">等级 ' + lvl + ' / ' + up.max + '</span>' +
        '<span class="up-cost">' + (maxed ? '已满级' : cost + ' 细胞') + '</span>' +
      '</span>';
    if (!maxed) {
      btn.addEventListener('click', () => buyUpgrade(up.id));
    }
    el.appendChild(btn);
  }
}

function renderAllShops() {
  renderShopInto(document.getElementById('shop-menu'));
  renderShopInto(document.getElementById('shop-death'));
  renderWeaponPicker();
  updateMetaUI();
}

/* =========================================================
   武器库:开局主手选择
   ========================================================= */
const START_WEAPON_KEY = 'deadcells_start_weapon';

function getStartWeapon() {
  const rec = storage.get(START_WEAPON_KEY, null);
  if (rec && typeof rec.id === 'string' && WEAPON_MAP[rec.id]) return rec.id;
  return 'balanced';
}

function setStartWeapon(id) {
  if (!WEAPON_MAP[id]) return;
  storage.set(START_WEAPON_KEY, { id });
  renderWeaponPicker();
  sfx.init();
  sfx.resume();
  sfx.play('equip');
}

function renderWeaponPicker() {
  const el = document.getElementById('weapon-picker');
  if (!el) return;
  el.innerHTML = '';
  const cur = getStartWeapon();
  const curDef = WEAPON_MAP[cur];
  const curEl = document.getElementById('weapon-current');
  if (curEl) curEl.textContent = '当前:' + (curDef ? curDef.name : '均衡之刃');
  const unlocked = (game.meta && game.meta.blueprints) || [];
  for (const w of WEAPON_DEFS) {
    const locked = !!w.blueprint && !unlocked.includes(w.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    const kindTag = w.kind === 'ranged' ? '远程' : '近战';
    btn.className = 'weapon-chip' + (w.id === cur ? ' active' : '') + (locked ? ' locked' : '');
    btn.disabled = locked;
    btn.innerHTML = '<b>' + (locked ? '？？？' : w.name) + '</b>' +
      '<span>' + (locked ? '需图纸解锁' : kindTag + ' · ' + STATS[w.stat].name) + '</span>';
    btn.title = locked ? '在局内击败精英/Boss 拾取图纸后解锁' : w.desc;
    if (!locked) btn.addEventListener('click', () => setStartWeapon(w.id));
    el.appendChild(btn);
  }
}

/* 开局把选中的武器装到主手 */
function applyStartWeapon(p) {
  if (!p) return;
  const id = getStartWeapon();
  if (id === 'balanced') return;
  p.gear.weaponA = makeItem(id, 'weapon', 1, RARITY[0]);
  p.onWeaponChanged();
  p.refreshGearStats();
}

function buyUpgrade(id) {
  if (!game.meta) return;
  const up = UPGRADES.find((u) => u.id === id);
  if (!up) return;
  const lvl = game.meta.up[id] || 0;
  if (lvl >= up.max) return;
  const cost = up.costs[lvl];
  if (game.meta.cells < cost) return;
  game.meta.cells -= cost;
  game.meta.up[id] = lvl + 1;
  saveMeta();
  renderAllShops();
  sfx.init();
  sfx.resume();
  sfx.play('levelup');
}

/* =========================================================
   界面切换
   ========================================================= */
function showScreen(name) {
  for (const n of ['menu', 'death', 'pause']) {
    const el = document.getElementById('screen-' + n);
    if (!el) continue;
    el.classList.toggle('hidden', n !== name);
  }
  /* 触屏操作层只在真正游玩时出现 */
  document.body.classList.toggle('playing', name === null);
}

function setupUI() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  bind('btn-start', startRun);
  bind('btn-retry', startRun);
  bind('btn-death-menu', goMenu);
  bind('btn-resume', resumeGame);
  bind('btn-pause-restart', startRun);
  bind('btn-pause-menu', goMenu);

  const controlsBtn = document.getElementById('btn-controls');
  const controlsCard = document.getElementById('controls-card');
  if (controlsBtn && controlsCard) {
    controlsBtn.addEventListener('click', () => {
      controlsCard.classList.toggle('hidden');
      controlsBtn.textContent = controlsCard.classList.contains('hidden') ? '操作说明' : '收起说明';
    });
  }
}

/* =========================================================
   初始化 / 尺寸
   ========================================================= */
function initGame() {
  game.canvas = document.getElementById('game');
  if (!game.canvas) return;
  game.ctx = game.canvas.getContext('2d');
  game.meta = loadMeta();
  resize();
  preparePreview();
  setupUI();
  setupInput();
  setupTouchControls();
  renderAllShops();
  updateMetaUI();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

function resize() {
  if (!game.canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(240, window.innerHeight);
  game.dpr = dpr;
  game.cssW = w;
  game.cssH = h;
  game.canvas.width = Math.round(w * dpr);
  game.canvas.height = Math.round(h * dpr);
  game.canvas.style.width = w + 'px';
  game.canvas.style.height = h + 'px';
  game.scale = Math.max(0.42, h / WORLD_H);
  game.viewW = w / game.scale;
  if (game.level) {
    game.cam.x = clamp(game.cam.x, 0, Math.max(0, game.level.width - game.viewW));
  }
}

/* =========================================================
   场景准备 / 关卡流程
   ========================================================= */
function preparePreview() {
  game.state = 'menu';
  game.stage = 1;
  game.level = generateStage(1);

  const p = new Player(game.meta);
  p.x = 870;
  p.y = GROUND_Y;
  p.facing = 1;
  p.state = 'idle';
  p.invuln = 0;
  p.attackAngle = -1.05;
  game.player = p;

  game.enemies = [];
  game.knives = [];
  game.bombs = [];
  game.waves = [];
  game.turrets = [];
  game.smokeT = 0;
  game.pickups = [];
  game.particles = [];
  game.texts = [];
  game.cam.x = 0;
  game.cam.sx = 0;
  game.cam.sy = 0;
  game.time = 0;
  game.transition = null;
  game.intro = null;
  game.toast = null;
  game.nearDoor = false;
  game.dyingT = 0;
  game.dyingAlpha = 0;
  game.hurtFlash = 0;
  game.shake = 0;
  game.hitStop = 0;
  game.run = { gold: 0, cells: 0, kills: 0 };
  game.emberAcc = 0;
}

function startRun() {
  sfx.init();
  sfx.resume();
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  game.state = 'playing';
  game.run = { gold: 0, cells: 0, kills: 0 };
  game.player = new Player(game.meta);
  applyStartWeapon(game.player);
  game.hitStop = 0;
  game.hurtFlash = 0;
  game.shake = 0;
  game.transition = null;
  game.toast = null;
  game.intro = null;
  game.infection = 0;
  game.tideActive = false;
  game.tideT = 0;
  game.purgePause = 0;
  game.dyingT = 0;
  game.dyingAlpha = 0;
  loadStage(1, true);
  game.intro = { t: 0, title: game.level.name };
  showScreen(null);
  lastTime = performance.now();
  accumulator = 0;
  sfx.play('door');
}

function loadStage(index, initial) {
  game.stage = index;
  game.level = generateStage(index);

  game.enemies = game.level.spawns.map((s) => spawnEnemy(s.type, s.x, s.y, index));
  if (game.level.bossSpawn) {
    game.enemies.push(spawnEnemy('boss', game.level.bossSpawn.x, game.level.bossSpawn.y, index));
  }

  game.knives = [];
  game.bombs = [];
  game.waves = [];
  game.turrets = [];
  game.smokeT = 0;
  game.pickups = [];
  game.particles = [];
  game.texts = [];

  /* 散布属性卷轴 */
  if (game.level.scrollSpots) {
    for (const s of game.level.scrollSpots) {
      spawnPickup(game, 'scroll', s.x, s.y, 1, 0, 0);
    }
  }

  /* 上一局的回响遗产:在第一区起点生成残片宝箱 */
  game.echoChest = null;
  if (initial) {
    const echo = loadEcho();
    if (echo) {
      const pk = spawnPickup(game, 'echo', 560, GROUND_Y - 40, 0, 0, 0);
      if (pk) game.echoChest = pk;
    }
  }

  const p = game.player;
  if (p) {
    p.resetAt(130, GROUND_Y);
    /* 药水不再每区白送,只能在商人处购买补充 */
    p.invuln = 0.7;
  }

  game.cam.x = 0;
  game.cam.sx = 0;
  game.cam.sy = 0;
  game.shake = 0;
  game.nearDoor = false;
  game.toast = null;
  game.intro = null;
  game.hurtFlash = 0;
  game.hitStop = 0;
  game.choice = null;

  /* 进入新区域:变异三选一(最多 3 个) */
  if (!initial && p && p.mutations.length < 3) {
    openMutationChoice();
  }
}

function beginTransition() {
  if (game.transition) return;
  game.transition = { phase: 'out', t: 0, next: game.stage + 1 };
  if (game.player) game.player.vx = 0;
  sfx.play('door');
}

function updateTransition(dt) {
  const tr = game.transition;
  if (!tr) return;
  tr.t += dt;
  if (tr.phase === 'out' && tr.t >= 0.45) {
    loadStage(tr.next);
    tr.phase = 'in';
    tr.t = 0;
    tr.title = game.level.name;
    tr.sub = '深度 ' + game.stage + ' · ' + game.level.theme.en;
    sfx.play('door');
    if (game.level.bossStage) {
      showToast('狱卒苏醒了', 2.6);
      sfx.play('boss');
    }
  }
  if (tr.phase === 'in' && tr.t >= 0.85) {
    game.transition = null;
  }
}

function tryInteract() {
  if (game.state !== 'playing' || game.transition || game.choice) return;
  const p = game.player;
  if (!p) return;

  /* 收集者:把本局未消费的细胞存入永久账户 */
  const col = game.level.collector;
  if (col && Math.abs(p.x - col.x) < 90) {
    openCollectorChoice();
    return;
  }

  /* 商人:补给站 */
  const mer = game.level.merchant;
  if (mer && Math.abs(p.x - mer.x) < 90) {
    openMerchant();
    return;
  }

  if (!game.nearDoor) return;
  if (game.enemies.some((e) => e.type === 'boss' && !e.dead)) {
    showToast('大门被封印 · 先击败狱卒');
    sfx.play('block');
    return;
  }
  beginTransition();
}

/* 收集者:细胞入库(死亡时未入库的细胞会全部丢失) */
function depositCells() {
  const cells = game.run.cells;
  if (cells <= 0) {
    showToast('没有可存入的细胞', 1.8);
    sfx.play('block');
    return;
  }
  const meta = game.meta;
  meta.cells += cells;
  game.run.cells = 0;
  saveMeta();
  updateMetaUI();
  renderAllShops();
  showToast(`存入 ${cells} 个细胞 · 永久强化可用`, 2.6);
  sfx.play('cell');
  const p = game.player;
  game.addText(p.x, p.y - 100, '+' + cells, '#7df3ec', 20, true);
}

/* 商人:用金币购买补给 */
function openMerchant() {
  const p = game.player;
  const gold = game.run.gold;
  const itemPrice = 45 + game.stage * 10;
  const potionPrice = 30;
  const opts = [];

  opts.push({
    name: '随机装备',
    color: RARITY[2].color,
    desc: `获得一件随机品质装备（金币 ${itemPrice}）`,
    apply: () => {
      if (game.run.gold < itemPrice) { showToast('金币不足', 1.6); return; }
      game.run.gold -= itemPrice;
      rollItemDrop(game, p.x + p.facing * 40, p.y - 30);
      showToast('装备已掉落 · 按 E 拾取', 2.2);
    }
  });

  opts.push({
    name: '修复药水',
    color: '#7cf0c8',
    desc: `药水 +1（金币 ${potionPrice}）`,
    apply: () => {
      if (game.run.gold < potionPrice) { showToast('金币不足', 1.6); return; }
      if (p.potions >= p.potionsMax) { showToast('药水已满', 1.6); return; }
      game.run.gold -= potionPrice;
      p.potions++;
      showToast('药水已补充', 1.8);
    }
  });

  opts.push({
    name: '永久强化',
    color: '#f7c65c',
    desc: `本局细胞 +3（金币 25）`,
    apply: () => {
      if (game.run.gold < 25) { showToast('金币不足', 1.6); return; }
      game.run.gold -= 25;
      game.run.cells += 3;
      showToast('获得 3 个细胞 · 记得去收集者存起来', 2.4);
    }
  });

  openChoice(`流浪商人（金币 ${gold}）`, '补给有限,别把钱带进坟墓', opts);
}

function showToast(text, dur) {
  game.toast = { text, t: dur || 2.2 };
}

/* =========================================================
   三选一界面(属性卷轴 / 变异)
   ========================================================= */
function openChoice(title, subtitle, options) {
  game.choice = { title, subtitle, options, t: 0 };
  game.keys = {};
}

function applyChoice(i) {
  const c = game.choice;
  if (!c) return;
  const opt = c.options[i];
  if (!opt) return;
  game.choice = null;
  sfx.play('equip');
  if (opt.apply) opt.apply();
  if (opt.toast) showToast(opt.toast, 2.4);
}

/* 属性卷轴:暴虐 / 战术 / 生存 三选一 */
function openScrollChoice() {
  const p = game.player;
  if (!p) return;
  const opts = ['brutality', 'tactics', 'survival'].map((id) => {
    const st = STATS[id];
    return {
      name: st.name,
      color: st.color,
      desc: st.desc + `（当前 ${p.scrolls[id] || 0} 级）`,
      apply: () => {
        p.addScroll(id);
        game.addText(p.x, p.y - 108, st.name + ' +1', st.color, 20, true);
      },
      toast: `获得 ${st.name} 卷轴 · 对应属性提升`
    };
  });
  openChoice('血肉蜕变', '选择一种力量,让它在你体内扎根', opts);
}

/* 区域入口:变异三选一(最多 3 个) */
function openMutationChoice() {
  const p = game.player;
  if (!p || !p.mutations || p.mutations.length >= 3) return;
  const pool = MUTATIONS.filter((m) => !p.mutations.includes(m.id));
  if (!pool.length) return;
  const picks = [];
  const copy = pool.slice();
  for (let i = 0; i < 3 && copy.length; i++) {
    picks.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  const opts = picks.map((m) => ({
    name: m.icon + ' ' + m.name,
    color: '#c79bff',
    desc: m.desc,
    apply: () => {
      p.addMutation(m.id);
      game.addText(p.x, p.y - 108, '变异:' + m.name, '#c79bff', 18, true);
    },
    toast: `获得变异 ${m.name}`
  }));
  openChoice('突变', `在此地留下你的印记（${p.mutations.length}/3）`, opts);
}

/* =========================================================
   原创机制 A · 疫病潮汐
   感染值随时间与击杀上涨,满值触发潮汐:敌人更快更痛、掉落翻倍
   ========================================================= */
function updateInfection(dt) {
  const cfg = TIDE_CFG;

  if (game.tideActive) {
    game.tideT -= dt;
    if (game.tideT <= 0) {
      game.tideActive = false;
      game.tideT = 0;
      game.infection = 0;
      game.purgePause = 0;
      showToast('潮汐退去 · 感染清零', 2.2);
      game.addText(game.player.x, game.player.y - 110, '潮汐退去', '#8ae37f', 20, true);
    }
    return;
  }

  if (game.purgePause > 0) {
    game.purgePause -= dt;
    return;
  }

  game.infection = Math.min(cfg.threshold, game.infection + cfg.baseRate * dt);
  if (game.infection >= cfg.threshold) {
    game.tideActive = true;
    game.tideT = cfg.tideDur;
    game.infection = cfg.threshold;
    game.hitStop = Math.max(game.hitStop, 0.08);
    game.addShake(10);
    showToast('疫病潮汐!敌人狂暴,掉落翻倍', 3);
    sfx.play('thunder');
    const p = game.player;
    if (p) {
      game.addText(p.x, p.y - 110, '疫病潮汐', '#b8ff9c', 24, true);
      for (let i = 0; i < 26; i++) {
        game.emit({
          x: p.x + rand(-260, 260),
          y: p.y - rand(20, 200),
          vx: rand(-40, 40),
          vy: rand(-70, -20),
          life: rand(0.6, 1.3),
          size: rand(6, 16),
          color: 'rgba(150,230,140,0.35)',
          gravity: -20,
          drag: 1.4,
          type: 'smoke'
        });
      }
    }
  }
}

/* 净化感染(收集者处消耗资源) */
function purgeInfection() {
  const cfg = TIDE_CFG;
  if (game.run.cells >= cfg.purgeCellCost) game.run.cells -= cfg.purgeCellCost;
  else if (game.run.gold >= cfg.purgeGoldCost) game.run.gold -= cfg.purgeGoldCost;
  else {
    showToast(`净化需要 ${cfg.purgeCellCost} 细胞或 ${cfg.purgeGoldCost} 金币`, 2.2);
    sfx.play('block');
    return;
  }
  game.infection = 0;
  game.tideActive = false;
  game.tideT = 0;
  game.purgePause = cfg.purgePause;
  showToast(`感染已净化 · ${cfg.purgePause} 秒内不再累积`, 2.4);
  sfx.play('heal');
}

/* 收集者交互:存入细胞 或 净化感染 */
function openCollectorChoice() {
  const cfg = TIDE_CFG;
  const p = game.player;
  const opts = [
    {
      name: '存入细胞',
      color: '#7df3ec',
      desc: `把本局 ${game.run.cells} 个细胞存入永久账户`,
      apply: depositCells
    },
    {
      name: '净化感染',
      color: '#8ae37f',
      desc: `清空疫病感染（${cfg.purgeCellCost} 细胞 或 ${cfg.purgeGoldCost} 金币）,并压制 ${cfg.purgePause} 秒`,
      apply: purgeInfection
    },
    {
      name: '离开',
      color: '#b8c4c6',
      desc: '什么都不做,回到战场',
      apply: () => {}
    }
  ];
  openChoice(`收集者 · 感染 ${Math.floor(game.infection)}/${cfg.threshold}`, '细胞与疫病,都归我保管', opts);
  if (!p) game.choice = null;
}

/* =========================================================
   原创机制 B · 回响遗产
   上一次死亡的主武器会化为残片,在下一局起点等待取回
   ========================================================= */
const ECHO_KEY = 'deadcells_echo_v1';

function saveEcho() {
  const p = game.player;
  if (!p) return;
  const item = p.weaponItem();
  if (!item) {
    storage.remove(ECHO_KEY);
    return;
  }
  /* 品质按累计死亡数提升 */
  const deaths = (game.meta.runs || 0) + 1;
  let rarity = 'common';
  for (const step of ECHO_CFG.qualityByDeaths) {
    if (deaths >= step.min) rarity = step.rarity;
  }
  storage.set(ECHO_KEY, {
    defId: item.defId,
    kind: 'weapon',
    rarity,
    affixIds: (item.affixes || []).map((a) => a.id),
    mutation: (p.mutations && p.mutations[0]) || null,
    deaths,
    stage: game.stage
  });
}

function loadEcho() {
  return storage.get(ECHO_KEY, null);
}

/* 取回残片:还原武器 + 附带一个变异 */
function openEcho() {
  const echo = loadEcho();
  if (!echo) return;
  const p = game.player;
  const rarity = RARITY.find((r) => r.id === echo.rarity) || RARITY[0];
  const item = makeItem(echo.defId, echo.kind || 'weapon', 1, rarity);
  if (echo.affixIds && echo.affixIds.length) {
    item.affixes = echo.affixIds.slice(0, rarity.affixes).map((id) => {
      const def = AFFIX_MAP[id];
      return def ? { id, value: Math.round(rand(def.min, def.max)) } : null;
    }).filter(Boolean);
    applyAffixSum(item);
  }
  const old = equipItem(p, item);
  if (old) dropItemPickup(game, old, p.x - p.facing * 28, p.y);
  if (echo.mutation && p.mutations.length < 3) p.addMutation(echo.mutation);
  storage.remove(ECHO_KEY);
  game.echoChest = null;
  sfx.play('equip');
  game.addText(p.x, p.y - 108, '回响:' + itemName(item), rarity.color, 20, true);
  showToast(`取回第 ${echo.deaths} 次死亡的遗产`, 2.6);
}

function pauseGame() {
  if (game.state !== 'playing' || game.transition) return;
  game.state = 'paused';
  game.keys = {};
  showScreen('pause');
}

function resumeGame() {
  if (game.state !== 'paused') return;
  game.state = 'playing';
  game.keys = {};
  showScreen(null);
  lastTime = performance.now();
  accumulator = 0;
}

function goMenu() {
  preparePreview();
  game.meta = loadMeta();
  showScreen('menu');
  renderAllShops();
  updateMetaUI();
}

function killPlayer() {
  if (game.state !== 'playing' || !game.player || game.player.dead) return;
  const p = game.player;
  p.dead = true;
  p.hp = 0;
  p.state = 'dead';
  game.state = 'dying';
  game.dyingT = 0;
  game.dyingAlpha = 0;
  game.hitStop = 0.09;
  game.shake = Math.min(26, game.shake + 18);
  sfx.play('death');
  bloodBurst(p.x, p.y - 40, 1, '#b9303a', 34);
  for (let i = 0; i < 12; i++) {
    game.emit({
      x: p.x + rand(-16, 16),
      y: p.y - rand(10, 80),
      vx: rand(-120, 120),
      vy: rand(-260, -60),
      life: rand(0.5, 1.1),
      size: rand(2, 5),
      color: 'rgba(200,235,230,0.65)',
      glow: true,
      gravity: 200,
      drag: 1.5
    });
  }
}

function updateDying(dt) {
  game.time += dt;
  game.dyingT += dt;
  game.dyingAlpha = Math.min(0.82, game.dyingT * 0.62);
  updateParticles(game, dt);
  updateTexts(game, dt);
  updateCamera(dt);
  if (game.dyingT > 1.6 && game.state === 'dying') {
    finalizeDeath();
  }
}

function finalizeDeath() {
  game.state = 'dead';
  const meta = game.meta;
  /* 死亡惩罚:未在收集者处存入的细胞按难度保留率折算后清零 */
  const diff = DIFFICULTY[game.bcLevel || 0] || DIFFICULTY[0];
  const lost = game.run.cells;
  const kept = Math.floor(lost * (diff.cellRetain || 0));
  meta.cells += kept;
  meta.runs += 1;
  meta.kills += game.run.kills;
  meta.best = Math.max(meta.best, game.stage);
  saveMeta();
  saveEcho();

  const stageEl = document.getElementById('death-stage');
  const killsEl = document.getElementById('death-kills');
  const goldEl = document.getElementById('death-gold');
  const cellsEl = document.getElementById('death-cells');
  if (stageEl) stageEl.textContent = game.stage;
  if (killsEl) killsEl.textContent = game.run.kills;
  if (goldEl) goldEl.textContent = game.run.gold;
  if (cellsEl) cellsEl.textContent = lost;

  renderAllShops();
  showScreen('death');

  /* 死亡提示:未存入收集者的细胞会遗失 */
  const quoteEl = document.getElementById('death-quote');
  if (quoteEl) {
    if (kept > 0) quoteEl.textContent = `细胞 ${lost} 个,只保住 ${kept} 个。下次记得先找收集者。`;
    else if (lost > 0) quoteEl.textContent = `细胞 ${lost} 个全部遗失。下次记得先找收集者。`;
    else quoteEl.textContent = '血肉会腐朽，细胞会重生。';
  }
}

/* =========================================================
   输入
   ========================================================= */
function setupInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => {
    game.keys = {};
    if (game.state === 'playing') pauseGame();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.state === 'playing') pauseGame();
  });

  if (!game.canvas) return;
  game.canvas.addEventListener('mousedown', (e) => {
    sfx.init();
    sfx.resume();
    if (game.state !== 'playing' || game.transition) return;
    const p = game.player;
    if (!p || p.dead) return;
    if (e.button === 0) p.attackBuffer = 0.15;
    else if (e.button === 2) p.skill2Buffer = 0.13;
  });
  game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function onKeyDown(e) {
  sfx.init();
  sfx.resume();

  const code = e.code;
  if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' ||
      code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Tab') {
    e.preventDefault();
  }
  if (e.repeat) return;
  game.keys[code] = true;

  if (code === 'KeyM') {
    game.muted = !game.muted;
    sfx.setMuted(game.muted);
    return;
  }

  if (game.state === 'menu') {
    if (code === 'Enter' || code === 'NumpadEnter') startRun();
    return;
  }
  if (game.state === 'dead') {
    if (code === 'Enter' || code === 'KeyR') startRun();
    return;
  }
  if (game.state === 'paused') {
    if (code === 'Escape' || code === 'KeyP' || code === 'Enter') resumeGame();
    return;
  }
  if (game.state !== 'playing') return;

  /* 三选一界面:数字键 1/2/3 选择 */
  if (game.choice) {
    if (code === 'Digit1' || code === 'Numpad1') applyChoice(0);
    else if (code === 'Digit2' || code === 'Numpad2') applyChoice(1);
    else if (code === 'Digit3' || code === 'Numpad3') applyChoice(2);
    return;
  }

  if (code === 'Escape' || code === 'KeyP') {
    pauseGame();
    return;
  }

  const p = game.player;
  if (!p || p.dead || game.transition) return;

  if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') p.jumpBuffer = 0.13;
  else if (code === 'KeyJ') p.attackBuffer = 0.15;
  else if (code === 'KeyK' || code === 'ShiftLeft' || code === 'ShiftRight') p.rollBuffer = 0.13;
  else if (code === 'KeyU') p.skill1Buffer = 0.13;
  else if (code === 'KeyI') p.skill2Buffer = 0.13;
  else if (code === 'KeyQ') p.swapBuffer = 0.13;
  else if (code === 'KeyF') p.potionBuffer = 0.13;
  else if (code === 'KeyE') {
    if (!game.tryPickup()) tryInteract();
  }
}

function onKeyUp(e) {
  game.keys[e.code] = false;
}

/* =========================================================
   主循环
   ========================================================= */
function frame(now) {
  requestAnimationFrame(frame);

  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (!Number.isFinite(dt) || dt < 0) dt = 0;
  dt = Math.min(dt, 0.05);

  if (game.state === 'playing') {
    if (game.transition) {
      updateTransition(dt);
      updateCamera(dt);
    } else if (game.hitStop > 0) {
      game.hitStop -= dt;
      updateLightTimers(dt);
      updateCamera(dt);
    } else {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= STEP && steps < 3) {
        updateWorld(STEP);
        accumulator -= STEP;
        steps++;
        if (game.state !== 'playing') break;
      }
      if (steps >= 3) accumulator = 0;
    }
  } else if (game.state === 'dying') {
    updateDying(dt);
  } else if (game.state === 'menu') {
    updatePreview(dt);
  }

  render();
}

function updateLightTimers(dt) {
  game.hurtFlash = Math.max(0, game.hurtFlash - dt);
  if (game.toast) {
    game.toast.t -= dt;
    if (game.toast.t <= 0) game.toast = null;
  }
  if (game.intro) {
    game.intro.t += dt;
    if (game.intro.t > 3.5) game.intro = null;
  }
}

function updateWorld(dt) {
  game.time += dt;
  updateLightTimers(dt);

  /* 三选一界面:世界暂停,只推进界面动画 */
  if (game.choice) {
    game.choice.t += dt;
    updateCamera(dt);
    return;
  }

  const p = game.player;
  if (!p) return;
  p.update(dt, game);

  if (game.state !== 'playing') return;

  for (const e of game.enemies) {
    updateEnemy(e, dt, game);
  }
  updateEnemySeparation(game.enemies, dt);

  updateKnives(game, dt);
  updateBombs(game, dt);
  updateWaves(game, dt);
  updateTurrets(game, dt);
  game.smokeT = Math.max(0, game.smokeT - dt);
  updateInfection(dt);
  updatePickups(game, dt);
  updateParticles(game, dt);
  updateTexts(game, dt);

  game.enemies = game.enemies.filter((e) => !e.dead);

  const door = game.level.door;
  game.nearDoor = Math.abs(p.x - door.x) < 160 && Math.abs(p.y - door.y) < 90;

  updateCamera(dt);
}

function updateCamera(dt) {
  const p = game.player;
  if (!p || !game.level) return;
  if (game.state === 'menu') {
    game.cam.x = 0;
    game.cam.sx = 0;
    game.cam.sy = 0;
    return;
  }
  const target = clamp(
    p.x - game.viewW * 0.43 + p.facing * 38,
    0,
    Math.max(0, game.level.width - game.viewW)
  );
  const k = 1 - Math.exp(-7.5 * dt);
  game.cam.x = lerp(game.cam.x, target, k);
  game.shake = Math.max(0, game.shake - dt * 34);
  const s = game.shake;
  game.cam.sx = (Math.random() * 2 - 1) * s;
  game.cam.sy = (Math.random() * 2 - 1) * s * 0.7;
}

function updatePreview(dt) {
  game.time += dt;
  const p = game.player;
  if (p) {
    p.animT += dt;
    p.state = 'idle';
    p.onGround = true;
    p.vx = 0;
    p.vy = 0;
    p.updateCape(dt, game);
    game.emberAcc += dt;
    if (game.emberAcc > 0.08) {
      game.emberAcc = 0;
      game.emit({
        x: p.x + rand(-6, 8),
        y: p.y - 88 + rand(-6, 2),
        vx: rand(-12, 12),
        vy: rand(-38, -16),
        life: rand(0.4, 0.8),
        size: rand(1.4, 3),
        color: 'rgba(160,248,248,0.85)',
        glow: true,
        gravity: -25,
        drag: 1
      });
    }
  }
  updateParticles(game, dt);
  updateCamera(dt);
}

/* =========================================================
   渲染入口
   ========================================================= */
function render() {
  if (!game.ctx || !game.level) return;
  drawWorld(game);

  if (game.state === 'playing' || game.state === 'paused' || game.state === 'dying') {
    drawHUD(game);
    if (game.state === 'playing') {
      drawToast(game);
      drawInteractPrompt(game);
      drawIntro(game);
      drawChoicePanel(game);
    }
    drawTransition(game);
  }
  if (game.state === 'dying' || game.state === 'dead') {
    drawDeathVeil(game);
  }
}

/* =========================================================
   启动
   ========================================================= */
window.addEventListener('resize', resize);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame, { once: true });
} else {
  initGame();
}
