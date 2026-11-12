'use strict';

/* =========================================================
   世界渲染
   ========================================================= */
function ensureBackdrop(game) {
  if (!game._vig || game._vigW !== game.cssW || game._vigH !== game.cssH) {
    const g = game.ctx.createRadialGradient(
      game.cssW * 0.5, game.cssH * 0.48, game.cssH * 0.28,
      game.cssW * 0.5, game.cssH * 0.5, Math.max(game.cssW, game.cssH) * 0.72
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.62, 'rgba(2,5,7,0.22)');
    g.addColorStop(1, 'rgba(1,3,4,0.82)');
    game._vig = g;
    game._vigW = game.cssW;
    game._vigH = game.cssH;
  }
  if (!game._motes) {
    game._motes = [];
    for (let i = 0; i < 46; i++) {
      game._motes.push({
        x: Math.random(),
        y: Math.random(),
        s: rand(0.6, 2.2),
        sp: rand(6, 22),
        ph: rand(0, TAU),
        a: rand(0.12, 0.5)
      });
    }
  }
}

function drawSky(game) {
  const { ctx, cssW, cssH, level, cam, time } = game;
  const theme = level.theme;

  const sky = ctx.createLinearGradient(0, 0, 0, cssH);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(0.55, theme.skyBottom);
  sky.addColorStop(1, '#04080a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssW, cssH);

  // 星点
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.5) % 100) / 100;
    const sy = ((i * 53.7) % 60) / 100;
    const tw = 0.35 + Math.abs(Math.sin(time * 0.8 + i)) * 0.45;
    ctx.globalAlpha = tw * 0.6;
    ctx.fillStyle = theme.moon;
    const px = sx * cssW - cam.x * 0.008;
    const py = sy * cssH * 0.55;
    ctx.fillRect(((px % cssW) + cssW) % cssW, py, 1.4, 1.4);
  }
  ctx.restore();

  // 月亮
  const mx = cssW * 0.74 - cam.x * 0.015;
  const my = cssH * 0.2;
  const mr = Math.min(cssW, cssH) * 0.062;
  ctx.save();
  const halo = ctx.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 4.2);
  halo.addColorStop(0, 'rgba(220,245,245,0.22)');
  halo.addColorStop(0.35, 'rgba(180,225,230,0.07)');
  halo.addColorStop(1, 'rgba(180,225,230,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 4.2, my - mr * 4.2, mr * 8.4, mr * 8.4);
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.fillStyle = theme.moon;
  ctx.globalAlpha = 0.82;
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(mx - mr * 0.28, my - mr * 0.2, mr * 0.22, 0, TAU);
  ctx.arc(mx + mr * 0.3, my + mr * 0.25, mr * 0.15, 0, TAU);
  ctx.fillStyle = 'rgba(90,130,140,0.6)';
  ctx.fill();
  ctx.restore();

  // 远处雾带
  const fog = ctx.createLinearGradient(0, cssH * 0.48, 0, cssH * 0.78);
  fog.addColorStop(0, 'rgba(0,0,0,0)');
  fog.addColorStop(0.55, theme.fog);
  fog.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, cssH * 0.45, cssW, cssH * 0.36);
}

function drawParallax(game) {
  const { ctx, level, cam, cssW, time } = game;
  const theme = level.theme;

  // 远景塔楼
  ctx.save();
  ctx.fillStyle = theme.far;
  for (const b of level.bgFar) {
    const bx = b.x + cam.x * 0.78;
    if (bx < cam.x - 260 || bx > cam.x + game.viewW + 260) continue;
    const baseY = GROUND_Y - 40;
    const topY = baseY - b.h;
    ctx.fillRect(bx, topY, b.w, b.h + 60);
    if (b.roof) {
      ctx.beginPath();
      ctx.moveTo(bx - 12, topY);
      ctx.lineTo(bx + b.w / 2, topY - 42 - b.seed * 40);
      ctx.lineTo(bx + b.w + 12, topY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(bx - 8, topY + 40, b.w + 16, 12);
  }
  ctx.restore();

  // 远景雾
  const grad = ctx.createLinearGradient(0, GROUND_Y - 380, 0, GROUND_Y);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, theme.fog);
  ctx.fillStyle = grad;
  ctx.fillRect(cam.x - 50, GROUND_Y - 380, game.viewW + 100, 380);

  // 中景废墟
  ctx.save();
  ctx.fillStyle = theme.mid;
  for (const b of level.bgMid) {
    const bx = b.x + cam.x * 0.55;
    if (bx < cam.x - 240 || bx > cam.x + game.viewW + 240) continue;
    const baseY = GROUND_Y;
    const topY = baseY - b.h;
    if (b.arch) {
      ctx.beginPath();
      ctx.moveTo(bx, baseY);
      ctx.lineTo(bx, topY + 30);
      ctx.quadraticCurveTo(bx + b.w / 2, topY - 30, bx + b.w, topY + 30);
      ctx.lineTo(bx + b.w, baseY);
      ctx.lineTo(bx + b.w * 0.68, baseY);
      ctx.lineTo(bx + b.w * 0.68, topY + 60);
      ctx.quadraticCurveTo(bx + b.w / 2, topY + 10, bx + b.w * 0.32, topY + 60);
      ctx.lineTo(bx + b.w * 0.32, baseY);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(bx, topY, b.w, b.h);
      ctx.fillRect(bx - 8, topY, b.w + 16, 10);
    }
  }
  ctx.restore();

  // 悬浮尘埃
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const px = ((i * 197 + time * (9 + i % 4)) % (game.viewW + 200)) + cam.x - 100;
    const py = GROUND_Y - 80 - ((i * 89 + time * (14 + i % 5)) % 420);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + (i % 3) * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlatforms(game) {
  const { ctx, level, cam, viewW, time } = game;
  const theme = level.theme;
  const left = cam.x - 80;
  const right = cam.x + viewW + 80;

  // 深渊
  for (const pit of level.pits) {
    if (pit.x + pit.w < left || pit.x > right) continue;
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H);
    g.addColorStop(0, '#04080a');
    g.addColorStop(0.7, '#020405');
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(pit.x, GROUND_Y, pit.w, WORLD_H - GROUND_Y + 100);

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = 'rgba(120,190,200,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pit.x + 1, GROUND_Y);
    ctx.lineTo(pit.x + 1, GROUND_Y + 60);
    ctx.moveTo(pit.x + pit.w - 1, GROUND_Y);
    ctx.lineTo(pit.x + pit.w - 1, GROUND_Y + 60);
    ctx.stroke();
    ctx.restore();

    // 尖刺
    const spikeY = GROUND_Y + 92;
    for (let sx = pit.x + 6; sx < pit.x + pit.w - 4; sx += 13) {
      ctx.beginPath();
      ctx.moveTo(sx, spikeY);
      ctx.lineTo(sx + 6, spikeY - 24);
      ctx.lineTo(sx + 12, spikeY);
      ctx.closePath();
      ctx.fillStyle = '#1b2327';
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,180,185,0.35)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,20,26,0.16)';
    ctx.fillRect(pit.x, spikeY - 2, pit.w, 4);
  }

  for (const p of level.platforms) {
    if (p.x + p.w < left || p.x > right) continue;
    if (p.oneWay) {
      // 石台
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(p.x + 5, p.y + 9, p.w, p.h + 8);
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + 15);
      g.addColorStop(0, theme.stoneLight);
      g.addColorStop(0.3, theme.stone);
      g.addColorStop(1, theme.stoneDark);
      ctx.fillStyle = g;
      ctx.fillRect(p.x, p.y, p.w, 15);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(p.x, p.y, p.w, 1.4);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(p.x, p.y + 15, p.w, 4);

      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = 1;
      for (let bx = p.x + 38; bx < p.x + p.w - 8; bx += 48) {
        ctx.beginPath();
        ctx.moveTo(bx, p.y + 3);
        ctx.lineTo(bx, p.y + 14);
        ctx.stroke();
      }
      // 垂落苔藓
      ctx.fillStyle = 'rgba(60,120,95,0.3)';
      for (let mx = p.x + 16; mx < p.x + p.w; mx += 46) {
        const drop = 5 + ((mx * 7) % 9);
        ctx.fillRect(mx, p.y + 17, 2, drop);
      }
      continue;
    }

    // 主体地面
    const g = ctx.createLinearGradient(0, p.y, 0, WORLD_H);
    g.addColorStop(0, theme.stone);
    g.addColorStop(0.16, theme.stoneDark);
    g.addColorStop(0.6, '#0a1418');
    g.addColorStop(1, '#04080a');
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);

    // 顶面
    ctx.fillStyle = theme.stoneLight;
    ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.fillStyle = 'rgba(235,255,255,0.2)';
    ctx.fillRect(p.x, p.y, p.w, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(p.x, p.y + 4, p.w, 3);

    // 砖缝
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1;
    for (let bx = p.x + 44; bx < p.x + p.w; bx += 62) {
      ctx.beginPath();
      ctx.moveTo(bx, p.y + 8);
      ctx.lineTo(bx, p.y + 42);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 34);
    ctx.lineTo(p.x + p.w, p.y + 34);
    ctx.stroke();

    // 边缘苔藓
    ctx.fillStyle = 'rgba(54,104,84,0.34)';
    ctx.fillRect(p.x, p.y + 5, 10, 3);
    ctx.fillRect(p.x + p.w - 12, p.y + 5, 12, 3);
  }
}

function drawTorch(ctx, d, theme, time, seed) {
  const flick = 0.82 + Math.sin(time * 13 + seed) * 0.1 + Math.sin(time * 27 + seed * 2) * 0.06;
  const x = d.x;
  const y = d.y;

  // 支架
  ctx.save();
  ctx.strokeStyle = '#2a2018';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 2);
  ctx.lineTo(x + 3, y - 26);
  ctx.stroke();
  ctx.fillStyle = '#3a2c1d';
  ctx.fillRect(x - 2, y - 30, 8, 5);

  // 光晕
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x + 3, y - 36, 2, x + 3, y - 36, 72 * flick);
  glow.addColorStop(0, theme.torchGlow);
  glow.addColorStop(0.35, theme.torchGlow.replace(/0\.\d+\)/, '0.1)'));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x + 3, y - 36, 72 * flick, 0, TAU);
  ctx.fill();

  // 火焰
  drawFlameTongue(ctx, x + 3, y - 29, 6, 18 * flick, time, seed * 3.1, 'rgba(255,250,210,0.95)', theme.torch);
  drawFlameTongue(ctx, x + 3, y - 29, 3.5, 11 * flick, time * 1.22, seed * 5.3, 'rgba(255,255,255,0.95)', 'rgba(255,230,150,0.85)');
  ctx.restore();

  // 火星
  if (Math.random() < 0.35) {
    // 视觉火星交给粒子系统的话成本过高，这里只做轻量绘制
  }
}

function drawBanner(ctx, d, theme, time) {
  const sway = Math.sin(time * 0.9 + d.x * 0.01) * 3;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#2b1b1d';
  ctx.fillRect(-3, -210, 6, 210);
  ctx.beginPath();
  ctx.moveTo(-3, -200);
  ctx.lineTo(46 + sway, -196);
  ctx.lineTo(40 + sway, -120);
  ctx.lineTo(52 + sway, -104);
  ctx.lineTo(40 + sway, -52);
  ctx.lineTo(-3, -58);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -200, 0, -50);
  g.addColorStop(0, '#5a2228');
  g.addColorStop(0.6, '#391419');
  g.addColorStop(1, '#1c0a0d');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 纹章
  ctx.strokeStyle = 'rgba(220,190,120,0.4)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(21 + sway * 0.6, -152);
  ctx.lineTo(31 + sway * 0.6, -132);
  ctx.lineTo(21 + sway * 0.6, -112);
  ctx.lineTo(11 + sway * 0.6, -132);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPillar(ctx, d, theme) {
  const h = 250;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = theme.stoneDark;
  ctx.fillRect(d.x - 22, d.y - h, 44, h);
  ctx.fillStyle = 'rgba(120,170,175,0.08)';
  ctx.fillRect(d.x - 22, d.y - h, 8, h);
  ctx.fillStyle = theme.stone;
  ctx.fillRect(d.x - 30, d.y - h - 14, 60, 14);
  ctx.fillRect(d.x - 28, d.y - 34, 56, 34);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(d.x - 16, d.y - h + 40, 3, 90);
  ctx.fillRect(d.x + 10, d.y - h + 100, 2, 60);
  // 破损缺口
  ctx.fillStyle = 'rgba(5,10,12,0.9)';
  ctx.beginPath();
  ctx.moveTo(d.x + 8, d.y - h);
  ctx.lineTo(d.x + 22, d.y - h);
  ctx.lineTo(d.x + 22, d.y - h + 26);
  ctx.lineTo(d.x + 14, d.y - h + 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSkull(ctx, d, theme) {
  ctx.save();
  ctx.translate(d.x, d.y - 4);
  ctx.fillStyle = '#8e948a';
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 11;
    const oy = i === 1 ? -6 : 0;
    ctx.beginPath();
    ctx.ellipse(ox, oy, 6, 5, 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#151a17';
    ctx.beginPath();
    ctx.arc(ox - 2, oy - 1, 1.1, 0, TAU);
    ctx.arc(ox + 2, oy - 1, 1.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8e948a';
  }
  ctx.restore();
}

function drawMoss(ctx, d) {
  ctx.save();
  ctx.strokeStyle = 'rgba(78,140,108,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    const x = d.x + (i - 2) * 4;
    ctx.beginPath();
    ctx.moveTo(x, d.y);
    ctx.quadraticCurveTo(x + (i - 2) * 2, d.y - 9, x + (i - 2) * 5, d.y - 14 - (i % 2) * 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDecor(game) {
  const { ctx, level, cam, viewW, time } = game;
  const theme = level.theme;
  const left = cam.x - 160;
  const right = cam.x + viewW + 160;

  // 背景：柱与旗
  for (const d of level.decor) {
    if (d.x < left || d.x > right) continue;
    if (d.type === 'pillar') drawPillar(ctx, d, theme);
    else if (d.type === 'banner') drawBanner(ctx, d, theme, time);
  }
  // 前景：火把、头骨、苔藓
  for (const d of level.decor) {
    if (d.x < left || d.x > right) continue;
    if (d.type === 'torch') drawTorch(ctx, d, theme, time, d.x * 0.03);
    else if (d.type === 'skull') drawSkull(ctx, d, theme);
    else if (d.type === 'moss') drawMoss(ctx, d);
  }
}

function drawDoor(game) {
  const { ctx, level, time } = game;
  const door = level.door;
  const theme = level.theme;
  const bossAlive = game.enemies.some((e) => e.type === 'boss' && !e.dead);
  const x = door.x;
  const y = door.y;

  // 台阶
  ctx.fillStyle = theme.stoneDark;
  ctx.fillRect(x - 74, y - 10, 148, 14);
  ctx.fillStyle = theme.stoneLight;
  ctx.fillRect(x - 74, y - 10, 148, 2);

  // 门框
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 62, y);
  ctx.lineTo(x - 62, y - 150);
  ctx.quadraticCurveTo(x, y - 240, x + 62, y - 150);
  ctx.lineTo(x + 62, y);
  ctx.closePath();
  const fg = ctx.createLinearGradient(x - 62, y - 220, x + 62, y);
  fg.addColorStop(0, theme.stoneLight);
  fg.addColorStop(0.5, theme.stone);
  fg.addColorStop(1, theme.stoneDark);
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 门内
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - 48, y);
  ctx.lineTo(x - 48, y - 144);
  ctx.quadraticCurveTo(x, y - 218, x + 48, y - 144);
  ctx.lineTo(x + 48, y);
  ctx.closePath();
  const ig = ctx.createLinearGradient(x, y - 210, x, y);
  if (bossAlive) {
    ig.addColorStop(0, '#2a0c10');
    ig.addColorStop(0.55, '#190609');
    ig.addColorStop(1, '#070203');
  } else {
    ig.addColorStop(0, '#0d3b40');
    ig.addColorStop(0.5, '#072025');
    ig.addColorStop(1, '#030c0e');
  }
  ctx.fillStyle = ig;
  ctx.fill();

  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const rot = time * 0.8;
  const color = bossAlive ? 'rgba(220,70,70,' : 'rgba(100,240,240,';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(
      x + Math.sin(rot + i * 1.6) * 10,
      y - 96 + Math.cos(rot * 0.8 + i * 1.2) * 34,
      26 - i * 3, 44 - i * 4,
      rot * 0.5 + i, 0, TAU
    );
    ctx.strokeStyle = color + (0.1 + i * 0.04) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const portalGlow = ctx.createRadialGradient(x, y - 100, 4, x, y - 100, 92);
  portalGlow.addColorStop(0, bossAlive ? 'rgba(255,80,80,0.2)' : 'rgba(120,255,250,0.2)');
  portalGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = portalGlow;
  ctx.fillRect(x - 90, y - 220, 180, 230);
  ctx.restore();

  // 门框装饰
  ctx.save();
  ctx.strokeStyle = bossAlive ? 'rgba(200,80,80,0.35)' : 'rgba(120,230,230,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 54, y - 150);
  ctx.quadraticCurveTo(x, y - 228, x + 54, y - 150);
  ctx.stroke();
  ctx.fillStyle = bossAlive ? 'rgba(255,90,90,0.55)' : 'rgba(140,250,250,0.6)';
  ctx.beginPath();
  ctx.moveTo(x, y - 236);
  ctx.lineTo(x + 8, y - 224);
  ctx.lineTo(x, y - 212);
  ctx.lineTo(x - 8, y - 224);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 锁链
  if (bossAlive) {
    ctx.save();
    ctx.strokeStyle = 'rgba(130,130,120,0.5)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const cx = x - 35 + i * 23;
      ctx.beginPath();
      ctx.moveTo(cx, y - 150 + Math.abs(i - 1.5) * 8);
      ctx.lineTo(cx + 2, y - 40);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40,40,36,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(130,130,120,0.5)';
      ctx.lineWidth = 3;
    }
    ctx.restore();
  }
}

function drawBossHazard(game) {
  const { ctx } = game;
  const boss = game.enemies.find((e) => e.type === 'boss' && !e.dead);
  if (!boss) return;
  const t = game.time;
  if (boss.state === 'slamWind') {
    const p = 1 - boss.stateT / 0.7;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 22) * 0.12;
    ctx.strokeStyle = 'rgba(255,80,70,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(boss.x, GROUND_Y, 190 * p, 18 * p, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = 'rgba(255,70,60,0.9)';
    ctx.beginPath();
    ctx.ellipse(boss.x, GROUND_Y, 190 * p, 18 * p, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  if (boss.state === 'chargeWind') {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(t * 18) * 0.1;
    ctx.fillStyle = 'rgba(255,80,60,0.7)';
    const dir = boss.facing;
    ctx.beginPath();
    ctx.moveTo(boss.x, GROUND_Y - 40);
    ctx.lineTo(boss.x + dir * 330, GROUND_Y - 12);
    ctx.lineTo(boss.x + dir * 330, GROUND_Y + 2);
    ctx.lineTo(boss.x, GROUND_Y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawShockwaves(game) {
  const { ctx } = game;
  for (const w of game.waves) {
    const alpha = clamp(w.life / 0.5, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = 'rgba(255,150,90,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w.x, GROUND_Y, 22, Math.PI, 0);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = 'rgba(255,230,180,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.x, GROUND_Y, 12, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPickups(game) {
  const { ctx, time } = game;
  for (const p of game.pickups) {
    if (p.collected) continue;
    const bob = Math.sin(time * 4 + p.seed) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.type === 'gold') {
      ctx.shadowColor = 'rgba(255,200,90,0.9)';
      ctx.shadowBlur = 9;
      ctx.fillStyle = '#f7c65c';
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.4, 6.4, 0, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,250,220,0.8)';
      ctx.beginPath();
      ctx.ellipse(-1.4, -2, 1.6, 2.4, 0.4, 0, TAU);
      ctx.fill();
    } else if (p.type === 'item' && p.item) {
      /* 装备掉落:按品质发光的光球 + 内部图标 */
      const r = itemRarity(p.item);
      const def = itemDef(p.item);
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(8,14,17,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 10;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.scale(0.72, 0.72);
      drawAbilityIcon(ctx, def ? (p.item.kind === 'weapon' ? (def.kind === 'ranged' ? 'bow' : 'weapon') : def.id) : null, 0, 0, 26);
      ctx.restore();
      /* 底部品质光晕 */
      ctx.fillStyle = r.color;
      ctx.globalAlpha = 0.18 + Math.sin(time * 3 + p.seed) * 0.07;
      ctx.beginPath();
      ctx.ellipse(0, 13, 15, 4, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'scroll') {
      /* 属性卷轴:紫色卷轴 + 光柱 */
      ctx.shadowColor = 'rgba(199,155,255,0.95)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#e7dbff';
      ctx.fillRect(-7, -9, 14, 18);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#8f74c4';
      ctx.fillRect(-7, -9, 14, 2.5);
      ctx.fillRect(-7, 6.5, 14, 2.5);
      ctx.fillStyle = 'rgba(120,90,190,0.55)';
      ctx.fillRect(-4.5, -4, 9, 1.4);
      ctx.fillRect(-4.5, -1, 9, 1.4);
      ctx.fillStyle = 'rgba(199,155,255,0.16)';
      ctx.beginPath();
      ctx.moveTo(-9, 10);
      ctx.lineTo(-5, -34);
      ctx.lineTo(5, -34);
      ctx.lineTo(9, 10);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'echo') {
      /* 回响残片:悬浮的破碎晶体 */
      const spin = time * 1.4 + p.seed;
      ctx.shadowColor = 'rgba(199,155,255,0.95)';
      ctx.shadowBlur = 22;
      ctx.rotate(spin);
      ctx.fillStyle = '#c79bff';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(9, -3);
      ctx.lineTo(4, 12);
      ctx.lineTo(-6, 10);
      ctx.lineTo(-10, -2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.rotate(-spin * 2);
      ctx.fillStyle = 'rgba(240,230,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 7);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    } else if (p.type === 'blueprint') {
      /* 图纸:卷轴样式 */
      ctx.shadowColor = 'rgba(120,235,255,0.95)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#e8f6f2';
      ctx.fillRect(-8, -10, 16, 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(90,150,160,0.7)';
      ctx.fillRect(-6, -6, 12, 1.6);
      ctx.fillRect(-6, -2, 12, 1.6);
      ctx.fillRect(-6, 2, 9, 1.6);
      ctx.fillStyle = '#7df3ec';
      ctx.fillRect(-9, -12, 18, 3);
      ctx.fillRect(-9, 9, 18, 3);
    } else {
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = 'rgba(110,245,240,0.95)';
      ctx.shadowBlur = 13;
      ctx.fillStyle = '#7df3ec';
      ctx.fillRect(-4.6, -4.6, 9.2, 9.2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(-2, -2, 2.4, 2.4);
    }
    ctx.restore();
  }
}

function drawKnives(game) {
  const { ctx } = game;
  for (const k of game.knives) {
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.rot);
    ctx.fillStyle = '#dfeff2';
    ctx.shadowColor = 'rgba(150,250,255,0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.lineTo(9, 0);
    ctx.lineTo(-9, 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6a5238';
    ctx.fillRect(-13, -1.4, 5, 2.8);
    ctx.restore();
  }
}

function drawBombs(game) {
  const { ctx, time } = game;
  for (const b of game.bombs) {
    const blink = b.fuse < 0.35 ? (Math.sin(time * 40) > 0 ? '#ff6b5a' : '#5c1d18') : '#3d4740';
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = blink;
    ctx.beginPath();
    ctx.arc(0, 0, b.team === 'player' ? 8 : 6.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.strokeStyle = b.team === 'player' ? 'rgba(120,240,240,0.9)' : 'rgba(255,120,80,0.9)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(4, -12, 8, -10);
    ctx.stroke();
    ctx.fillStyle = b.team === 'player' ? '#8ff7f0' : '#ffb066';
    ctx.beginPath();
    ctx.arc(8, -10, 1.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(game) {
  const { ctx } = game;
  for (const p of game.particles) {
    const lifeRatio = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = lifeRatio * (p.alpha || 1);
    if (p.glow) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
    }
    if (p.type === 'rock') {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    } else if (p.type === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * lifeRatio + 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.016, p.y - p.vy * 0.016);
      ctx.stroke();
    } else if (p.type === 'smoke') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - lifeRatio * 0.6), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * lifeRatio), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawFloatingTexts(game) {
  const { ctx } = game;
  for (const tx of game.texts) {
    const a = clamp(tx.age / 0.12, 0, 1) * clamp(tx.life / 0.35, 0, 1);
    const scale = tx.crit ? 1.22 : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(tx.x, tx.y);
    ctx.scale(scale, scale);
    ctx.font = `${tx.crit ? 800 : 700} ${tx.size}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(tx.text, 0, 0);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.text, 0, 0);
    ctx.restore();
  }
}

function drawPlayerAfterimages(game) {
  const { ctx } = game;
  const p = game.player;
  for (const a of p.afterimages) {
    const alpha = clamp(a.t / 0.22, 0, 1) * 0.22;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(a.x, a.y);
    ctx.scale(a.facing, 1);
    ctx.fillStyle = '#8fe9ea';
    fillRoundRect(ctx, -14, -78, 28, 70, 12, '#8fe9ea');
    ctx.beginPath();
    ctx.arc(3, -84, 12, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawWorld(game) {
  const { ctx, dpr, scale, cam } = game;

  ensureBackdrop(game);

  // 天空
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSky(game);

  // 世界层
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  ctx.translate(-cam.x + cam.sx, cam.sy);

  drawParallax(game);
  drawDecor(game);
  drawPlatforms(game);
  drawDoor(game);
  drawMerchantAndCollector(game);
  drawBossHazard(game);
  drawShockwaves(game);
  drawPickups(game);
  drawPlayerAfterimages(game);

  for (const e of game.enemies) drawEnemy(ctx, e, game);
  if (game.player) drawPlayer(ctx, game.player, game);

  drawKnives(game);
  drawBombs(game);
  drawParticles(game);
  drawFloatingTexts(game);

  if (game.stage === 1 && game.state === 'playing') drawTutorialHints(game);

  // 屏幕层
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawAtmosphere(game);
}

/* 商人(补给站) 与 收集者(细胞祭坛) */
function drawMerchantAndCollector(game) {
  const { ctx, time, level } = game;
  if (!level) return;

  /* ---------- 收集者:发光方尖碑 ---------- */
  const col = level.collector;
  if (col) {
    const px = col.x;
    const py = col.y;
    const pulse = 0.6 + Math.sin(time * 2.4) * 0.25;
    ctx.save();
    ctx.translate(px, py);
    // 底座
    ctx.fillStyle = '#1b2a30';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#22343b';
    ctx.fillRect(-20, -14, 40, 14);
    // 碑身
    const g = ctx.createLinearGradient(-14, -96, 14, -14);
    g.addColorStop(0, '#4f8f95');
    g.addColorStop(0.5, '#2a5259');
    g.addColorStop(1, '#13282d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-14, -14);
    ctx.lineTo(-9, -88);
    ctx.lineTo(0, -100);
    ctx.lineTo(9, -88);
    ctx.lineTo(14, -14);
    ctx.closePath();
    ctx.fill();
    // 核心
    ctx.shadowColor = 'rgba(125,243,236,0.95)';
    ctx.shadowBlur = 18 * pulse + 6;
    ctx.fillStyle = `rgba(125,243,236,${0.65 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(0, -56, 5.4, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 上升光尘
    for (let i = 0; i < 5; i++) {
      const t = (time * 0.5 + i * 0.2) % 1;
      ctx.globalAlpha = (1 - t) * 0.5;
      ctx.fillStyle = '#7df3ec';
      ctx.beginPath();
      ctx.arc(Math.sin((i + time) * 2) * 10, -20 - t * 90, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 商人:兜帽身影 + 提灯 ---------- */
  const mer = level.merchant;
  if (mer) {
    const px = mer.x;
    const py = mer.y;
    ctx.save();
    ctx.translate(px, py);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 6, 0, 0, TAU);
    ctx.fill();
    // 斗篷
    const g = ctx.createLinearGradient(0, -74, 0, 0);
    g.addColorStop(0, '#2c3a3f');
    g.addColorStop(1, '#111a1e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-20, -50, 0, -74);
    ctx.quadraticCurveTo(20, -50, 16, 0);
    ctx.quadraticCurveTo(0, 6, -16, 0);
    ctx.closePath();
    ctx.fill();
    // 兜帽阴影
    ctx.fillStyle = '#05090b';
    ctx.beginPath();
    ctx.ellipse(0, -56, 9, 11, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,190,110,0.9)';
    ctx.beginPath();
    ctx.arc(-3, -57, 1.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.6, -57, 1.5, 0, TAU);
    ctx.fill();
    // 提灯
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(14, -40);
    ctx.lineTo(20, -26);
    ctx.stroke();
    ctx.shadowColor = 'rgba(255,170,90,0.95)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255,186,110,0.92)';
    ctx.fillRect(17, -26, 8, 10);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawTutorialHints(game) {
  const { ctx, player } = game;
  if (!player || player.x > 980) return;
  const hints = game.isTouch ? [
    { x: 292, y: 512, text: '左侧摇杆  移动' },
    { x: 520, y: 512, text: '跳跃键  连点两次可二段跳' },
    { x: 748, y: 512, text: '攻击键  斩击' },
    { x: 950, y: 512, text: '翻滚键  闪避' }
  ] : [
    { x: 292, y: 512, text: 'A / D  移动' },
    { x: 520, y: 512, text: 'SPACE  跳跃' },
    { x: 748, y: 512, text: 'J  斩击' },
    { x: 950, y: 512, text: 'K  翻滚' }
  ];
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 12px "Noto Sans SC","Microsoft YaHei",sans-serif';
  for (const h of hints) {
    const a = clamp(1 - Math.abs(player.x - h.x) / 420, 0.12, 0.8);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = 'rgba(210,240,240,0.9)';
    ctx.fillText(h.text, h.x, h.y);
    ctx.globalAlpha = a * 0.35;
    ctx.strokeStyle = 'rgba(120,220,225,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(h.x - 30, h.y + 8);
    ctx.lineTo(h.x + 30, h.y + 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAtmosphere(game) {
  const { ctx, cssW, cssH } = game;

  // 尘埃
  ctx.save();
  for (const m of game._motes) {
    const x = ((m.x * cssW + game.time * m.sp + Math.sin(game.time * 0.5 + m.ph) * 20) % (cssW + 60)) - 30;
    const y = ((m.y * cssH + game.time * m.sp * 0.6) % (cssH + 40)) - 20;
    ctx.globalAlpha = m.a * 0.5;
    ctx.fillStyle = 'rgba(190,235,235,0.8)';
    ctx.beginPath();
    ctx.arc(x, y, m.s, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // 暗角
  ctx.fillStyle = game._vig;
  ctx.fillRect(0, 0, cssW, cssH);

  // 受伤红晕
  if (game.hurtFlash > 0) {
    const a = clamp(game.hurtFlash, 0, 1);
    const rg = ctx.createRadialGradient(cssW / 2, cssH / 2, cssH * 0.25, cssW / 2, cssH / 2, cssH * 0.75);
    rg.addColorStop(0, 'rgba(160,20,30,0)');
    rg.addColorStop(1, `rgba(160,20,30,${a * 0.55})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  // 低血量脉动
  if (game.player && game.player.hp > 0 && game.player.hp / game.player.hpMax < 0.3) {
    const pulse = (Math.sin(game.time * 5) * 0.5 + 0.5) * 0.16;
    const rg = ctx.createRadialGradient(cssW / 2, cssH / 2, cssH * 0.28, cssW / 2, cssH / 2, cssH * 0.8);
    rg.addColorStop(0, 'rgba(150,10,20,0)');
    rg.addColorStop(1, `rgba(150,10,20,${pulse})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  // 疫病潮汐:病绿雾晕
  if (game.tideActive) {
    const breathe = 0.5 + Math.sin(game.time * 1.8) * 0.5;
    const rg = ctx.createRadialGradient(cssW / 2, cssH * 0.6, cssH * 0.18, cssW / 2, cssH * 0.6, cssH * 0.95);
    rg.addColorStop(0, 'rgba(90,190,90,0)');
    rg.addColorStop(1, `rgba(70,170,80,${0.16 + breathe * 0.1})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, cssW, cssH);
  }
}

/* 死亡渐暗 */
function drawDeathVeil(game) {
  if (!game.dyingAlpha) return;
  const { ctx, cssW, cssH } = game;
  ctx.save();
  ctx.fillStyle = `rgba(6,2,3,${clamp(game.dyingAlpha, 0, 0.82)})`;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.restore();
}
