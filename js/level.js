'use strict';

/* =========================================================
   主题与程序化关卡
   ========================================================= */
const THEMES = [
  {
    name: '被囚者的牢房',
    en: "PRISONERS' QUARTERS",
    skyTop: '#050d13',
    skyBottom: '#0f2b34',
    moon: '#d3eef1',
    far: '#0a1a22',
    mid: '#07141a',
    stoneLight: '#4a6a74',
    stone: '#27414a',
    stoneDark: '#14242b',
    edge: '#7fb0b8',
    moss: '#2e5a4b',
    fog: 'rgba(118,198,208,0.055)',
    accent: '#6fe8ea',
    accentSoft: 'rgba(111,232,234,0.16)',
    torch: '#ffb168',
    torchGlow: 'rgba(255,158,82,0.32)'
  },
  {
    name: '腐化下水道',
    en: 'CORRUPTED SEWERS',
    skyTop: '#040e09',
    skyBottom: '#0d291b',
    moon: '#c6f0d4',
    far: '#0a1a12',
    mid: '#06120d',
    stoneLight: '#4a6a50',
    stone: '#27402f',
    stoneDark: '#112218',
    edge: '#7dae87',
    moss: '#3e7a4a',
    fog: 'rgba(118,226,150,0.055)',
    accent: '#8ae37f',
    accentSoft: 'rgba(138,227,127,0.16)',
    torch: '#b8ff9c',
    torchGlow: 'rgba(130,230,140,0.28)'
  },
  {
    name: '钟楼残骸',
    en: 'CLOCK TOWER RUINS',
    skyTop: '#0a0715',
    skyBottom: '#241b3a',
    moon: '#e8d8ff',
    far: '#150f22',
    mid: '#0d0a17',
    stoneLight: '#5a4c76',
    stone: '#352c4a',
    stoneDark: '#191424',
    edge: '#a58cc4',
    moss: '#4a3a66',
    fog: 'rgba(190,150,255,0.05)',
    accent: '#c79bff',
    accentSoft: 'rgba(199,155,255,0.16)',
    torch: '#ff9bd2',
    torchGlow: 'rgba(220,120,255,0.28)'
  }
];

const ENEMY_NAMES = {
  husk: '囚徒',
  shield: '盾卫',
  grenadier: '掷弹兵',
  bat: '腐翼',
  boss: '狱卒'
};

function pickEnemyType(rng, stage, onPlatform) {
  const r = rng();
  if (onPlatform) return r < 0.55 ? 'grenadier' : 'husk';
  if (stage <= 1) {
    if (r < 0.56) return 'husk';
    if (r < 0.82) return 'bat';
    return 'grenadier';
  }
  if (stage <= 2) {
    if (r < 0.4) return 'husk';
    if (r < 0.62) return 'shield';
    if (r < 0.84) return 'bat';
    return 'grenadier';
  }
  if (r < 0.3) return 'husk';
  if (r < 0.52) return 'shield';
  if (r < 0.73) return 'bat';
  return 'grenadier';
}

function generateStage(stageIndex) {
  const theme = THEMES[(stageIndex - 1) % THEMES.length];
  const seed = (stageIndex * 2654435761 + 0x9E3779B9) >>> 0;
  const rng = mulberry32(seed);

  const platforms = [];
  const decor = [];
  const spawns = [];
  const pits = [];
  const slabs = [];

  function addGround(x, w) {
    platforms.push({ x, y: GROUND_Y, w, h: WORLD_H - GROUND_Y, oneWay: false });
  }
  function addSlab(x, y, w) {
    const slab = { x, y, w, h: 15, oneWay: true };
    platforms.push(slab);
    slabs.push(slab);
    return slab;
  }

  let x = 0;
  addGround(0, 1000);
  decor.push({ type: 'torch', x: 260, y: GROUND_Y });
  decor.push({ type: 'torch', x: 760, y: GROUND_Y });
  x = 1000;

  const chunkCount = 7 + Math.min(4, stageIndex);
  for (let i = 0; i < chunkCount; i++) {
    const isLastChunk = i === chunkCount - 1;
    let gap = (!isLastChunk && rng() < 0.55) ? Math.round(105 + rng() * 50) : 0;
    if (gap > 0) {
      pits.push({ x, y: GROUND_Y, w: gap });
      x += gap;
    }

    const w = Math.round(440 + rng() * 250);
    addGround(x, w);

    // 高低两层石台，保证可跳跃攀爬
    const lowW = Math.round(120 + rng() * 90);
    const lowX = x + 50 + rng() * Math.max(20, w - lowW - 140);
    addSlab(lowX, GROUND_Y - 132, lowW);
    decor.push({ type: 'torch', x: lowX + lowW / 2, y: GROUND_Y - 132 });

    if (rng() < 0.75) {
      const highW = Math.round(110 + rng() * 80);
      const highX = clamp(lowX + (rng() - 0.5) * 220, x + 30, x + w - highW - 30);
      addSlab(highX, GROUND_Y - 258, highW);
      decor.push({ type: 'torch', x: highX + highW / 2, y: GROUND_Y - 258 });
    }

    // 地面与背景装饰
    if (rng() < 0.75) decor.push({ type: 'torch', x: x + 40 + rng() * (w - 80), y: GROUND_Y });
    if (rng() < 0.55) decor.push({ type: 'pillar', x: x + 60 + rng() * (w - 120), y: GROUND_Y });
    if (rng() < 0.45) decor.push({ type: 'banner', x: x + 60 + rng() * (w - 120), y: GROUND_Y });
    if (rng() < 0.3) decor.push({ type: 'skull', x: x + 60 + rng() * (w - 120), y: GROUND_Y });
    if (rng() < 0.5) decor.push({ type: 'moss', x: x + 30 + rng() * (w - 60), y: GROUND_Y });

    // 敌人
    const count = 1 + Math.floor(rng() * 2) + (stageIndex >= 3 ? 1 : 0);
    for (let k = 0; k < count; k++) {
      const ex = x + 70 + rng() * (w - 140);
      spawns.push({ type: pickEnemyType(rng, stageIndex, false), x: ex, y: GROUND_Y });
    }
    // 石台上的远程敌人
    if (rng() < 0.4) {
      spawns.push({
        type: pickEnemyType(rng, stageIndex, true),
        x: lowX + lowW / 2,
        y: GROUND_Y - 132
      });
    }

    x += w;
  }

  /* 属性卷轴:每区 2~3 个,散落在走廊石台上 */
  const scrollSpots = [];
  const scrollCount = 2 + (rng() < 0.4 ? 1 : 0);
  for (let i = 0; i < scrollCount; i++) {
    const slab = slabs[Math.floor(rng() * slabs.length)];
    if (slab) {
      scrollSpots.push({ type: 'scroll', x: slab.x + slab.w / 2, y: slab.y - 22 });
    }
  }

  // 最终竞技场
  x += 110;
  addGround(x, 1200);
  decor.push({ type: 'torch', x: x + 80, y: GROUND_Y });
  decor.push({ type: 'torch', x: x + 1120, y: GROUND_Y });
  decor.push({ type: 'banner', x: x + 380, y: GROUND_Y });
  decor.push({ type: 'banner', x: x + 820, y: GROUND_Y });
  decor.push({ type: 'pillar', x: x + 180, y: GROUND_Y });
  decor.push({ type: 'pillar', x: x + 1030, y: GROUND_Y });

  const arenaX = x;
  const bossStage = stageIndex % 3 === 0;
  let bossSpawn = null;
  if (bossStage) {
    bossSpawn = { type: 'boss', x: arenaX + 760, y: GROUND_Y };
  } else {
    spawns.push({ type: 'shield', x: arenaX + 380, y: GROUND_Y });
    spawns.push({ type: pickEnemyType(rng, stageIndex, false), x: arenaX + 620, y: GROUND_Y });
  }

  const door = { x: arenaX + 1080, y: GROUND_Y };
  /* 商人(补给站)与收集者(细胞祭坛) */
  const merchant = { x: arenaX + 250, y: GROUND_Y };
  const collector = { x: arenaX + 640, y: GROUND_Y };
  x += 1200;
  const width = x;

  // 背景塔楼
  const bgFar = [];
  const bgMid = [];
  for (let bx = -300; bx < width + 400; bx += 190 + rng() * 220) {
    bgFar.push({
      x: bx,
      w: 100 + rng() * 170,
      h: 150 + rng() * 280,
      roof: rng() < 0.4,
      seed: rng()
    });
  }
  for (let bx = -260; bx < width + 400; bx += 230 + rng() * 260) {
    bgMid.push({
      x: bx,
      w: 70 + rng() * 130,
      h: 70 + rng() * 190,
      arch: rng() < 0.4,
      seed: rng()
    });
  }

  return {
    stageIndex,
    theme,
    name: theme.name,
    en: theme.en,
    width,
    platforms,
    slabs,
    decor,
    spawns,
    scrollSpots,
    pits,
    door,
    merchant,
    collector,
    bossStage,
    bossSpawn,
    arenaX,
    bgFar,
    bgMid
  };
}
