'use strict';

/* =========================================================
   角色绘制：两段式 IK 与精致火柴人剑客
   ========================================================= */
function solveIK(hx, hy, fx, fy, l1, l2, bend) {
  const dx = fx - hx;
  const dy = fy - hy;
  let d = Math.hypot(dx, dy);
  d = clamp(d, 1, l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const ang = Math.acos(cosA);
  const a = base + ang * bend;
  return { x: hx + Math.cos(a) * l1, y: hy + Math.sin(a) * l1 };
}

function strokeLimb(ctx, ax, ay, bx, by, cx, cy, width, color, dark) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = dark;
  ctx.lineWidth = width + 4;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineTo(cx, cy);
  ctx.stroke();
}

/* 披风绘制（当前已停用：主角不再披披风；保留函数，想恢复时在 drawPlayer 里
   把 drawPlayerCape(c, p) 加回像素精灵层即可） */
function drawPlayerCape(ctx, p) {
  const pts = p.capePts;
  if (!pts || pts.length < 2) return;
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(next.y - prev.y);
    let ny = next.x - prev.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const w = 12.5 * (1 - (i / (pts.length - 1)) * 0.72);
    left.push({ x: pt.x + nx * w, y: pt.y + ny * w });
    right.push({ x: pt.x - nx * w, y: pt.y - ny * w });
  }
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
  ctx.closePath();
  const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
  g.addColorStop(0, '#46626b');
  g.addColorStop(0.4, '#263c47');
  g.addColorStop(1, '#0c161d');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(6,12,16,0.9)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left[1].x, left[1].y);
  for (let i = 2; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
  ctx.strokeStyle = 'rgba(140,215,220,0.34)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 5; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = 'rgba(182,246,248,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawSword(ctx, x, y, angle, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (glow > 0 && !PX_SIL) {
    pxShadow(ctx, 'rgba(124,242,255,0.95)', 16 * glow);
  }
  ctx.shadowBlur = 0;

  const L = 76;   // 剑尖到护手的长度

  /* ---- 剑身：细长直剑，根部宽、中段收腰、剑尖拉成矛形 ---- */
  ctx.beginPath();
  ctx.moveTo(8, -5.4);
  ctx.quadraticCurveTo(40, -4.4, L - 13, -3.0);
  ctx.quadraticCurveTo(L - 6, -1.8, L, 0);
  ctx.quadraticCurveTo(L - 6, 1.8, L - 13, 3.0);
  ctx.quadraticCurveTo(40, 4.4, 8, 5.4);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, -5.4, 0, 5.4);
  bg.addColorStop(0, '#f4fdff');
  bg.addColorStop(0.16, '#cbe2e8');
  bg.addColorStop(0.44, '#7d949b');
  bg.addColorStop(0.5, '#44565c');
  bg.addColorStop(0.8, '#9db5bb');
  bg.addColorStop(1, '#e2f2f4');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(5,12,15,0.92)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* 中脊：贯穿剑身的一道硬高光 + 背侧暗边，撑出体量 */
  ctx.beginPath();
  ctx.moveTo(11, -3.2);
  ctx.quadraticCurveTo(42, -2.5, L - 15, -1.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, 3.4);
  ctx.quadraticCurveTo(42, 2.9, L - 15, 1.7);
  ctx.strokeStyle = 'rgba(120,150,158,0.55)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  /* 血槽(夹在中脊下的双线) */
  ctx.strokeStyle = 'rgba(30,46,52,0.6)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(14, 1.2);
  ctx.lineTo(52, 0.8);
  ctx.moveTo(14, 2.3);
  ctx.lineTo(46, 1.9);
  ctx.stroke();

  /* 根部符文刻痕:挥砍时点亮 */
  ctx.strokeStyle = glow > 0 ? 'rgba(150,250,255,0.95)' : 'rgba(110,205,215,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, -1.6);
  ctx.lineTo(13, 0);
  ctx.lineTo(10, 1.6);
  ctx.stroke();

  /* 刃口崩缺:一点战斗痕迹,别太脏 */
  ctx.fillStyle = 'rgba(10,18,22,0.7)';
  ctx.beginPath();
  ctx.moveTo(45, -4.2);
  ctx.lineTo(48, -1.9);
  ctx.lineTo(44.4, -2.1);
  ctx.closePath();
  ctx.fill();

  /* 剑尖白热 */
  ctx.beginPath();
  ctx.moveTo(L - 20, -0.4);
  ctx.lineTo(L - 1.5, 0);
  ctx.strokeStyle = 'rgba(225,255,255,0.9)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* ---- 护手:黄铜横扫护档 + 中央青玉 ---- */
  ctx.beginPath();
  ctx.moveTo(2.4, -2.4);
  ctx.quadraticCurveTo(1.2, -8, 4.4, -11.4);
  ctx.quadraticCurveTo(7.4, -8.4, 8.6, -3.4);
  ctx.lineTo(8.6, 3.4);
  ctx.quadraticCurveTo(7.4, 8.4, 4.4, 11.4);
  ctx.quadraticCurveTo(1.2, 8, 2.4, 2.4);
  ctx.closePath();
  const gg = ctx.createLinearGradient(1, -11, 9, 11);
  gg.addColorStop(0, '#f0d79a');
  gg.addColorStop(0.4, '#c39a52');
  gg.addColorStop(0.75, '#7a5a2a');
  gg.addColorStop(1, '#caa35c');
  ctx.fillStyle = gg;
  ctx.fill();
  ctx.strokeStyle = '#2a1e10';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(5.6, 0, 2.3, 0, TAU);
  ctx.fillStyle = 'rgba(126,246,250,0.95)';
  if (!PX_SIL) pxShadow(ctx, 'rgba(120,244,246,0.85)', 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(20,60,64,0.9)';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  /* ---- 握把:缠绳 + 铜丝 ---- */
  fillRoundRect(ctx, -9.4, -3.4, 12, 6.8, 2.4, '#33241c');
  ctx.strokeStyle = 'rgba(12,8,6,0.9)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, -9.4, -3.4, 12, 6.8, 2.4);
  ctx.stroke();
  for (let i = -8; i <= 1.4; i += 2.6) {
    ctx.beginPath();
    ctx.moveTo(i, -3.2);
    ctx.lineTo(i + 1.4, 3.2);
    ctx.strokeStyle = 'rgba(176,140,84,0.5)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  /* ---- 配重球:八角黄铜 ---- */
  ctx.beginPath();
  ctx.moveTo(-10, -3.4);
  ctx.lineTo(-13.6, -1.6);
  ctx.lineTo(-13.6, 1.6);
  ctx.lineTo(-10, 3.4);
  ctx.closePath();
  const pg = ctx.createLinearGradient(-13, -3, -10, 3);
  pg.addColorStop(0, '#e8c98a');
  pg.addColorStop(1, '#8a6630');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.strokeStyle = '#2a1e10';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/* =========================================================
   武器模型:按 WEAPON_DEFS 的 id 选择对应剪影
   原点在握把,默认沿 +x 方向伸出,内部已 rotate(angle)
   ========================================================= */
function drawBigSword(ctx, x, y, angle, glow, frost) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = frost ? 'rgba(150,230,255,0.95)' : 'rgba(124,242,255,0.95)';
    ctx.shadowBlur = 20 * glow;
  }
  ctx.beginPath();
  ctx.moveTo(8, -8.5);
  ctx.lineTo(74, -7.5);
  ctx.lineTo(88, -2.6);
  ctx.lineTo(92, 0);
  ctx.lineTo(84, 4);
  ctx.lineTo(74, 7.8);
  ctx.lineTo(8, 8.6);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -8.6, 0, 8.6);
  if (frost) {
    g.addColorStop(0, '#eafcff');
    g.addColorStop(0.28, '#bfe8f6');
    g.addColorStop(0.56, '#7fb6cc');
    g.addColorStop(0.8, '#5b8fa8');
    g.addColorStop(1, '#dff4fb');
  } else {
    g.addColorStop(0, '#f7feff');
    g.addColorStop(0.28, '#d8ecef');
    g.addColorStop(0.58, '#8ba3aa');
    g.addColorStop(0.82, '#4e636a');
    g.addColorStop(1, '#e4f4f6');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(6,14,17,0.92)';
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // 中脊
  ctx.strokeStyle = 'rgba(40,58,64,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(74, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, -1.6);
  ctx.lineTo(74, -1.2);
  ctx.stroke();
  // 护手
  ctx.beginPath();
  ctx.moveTo(3, -15);
  ctx.quadraticCurveTo(9, -15, 10, -9);
  ctx.lineTo(10, 9);
  ctx.quadraticCurveTo(9, 15, 3, 15);
  ctx.closePath();
  ctx.fillStyle = '#6b6350';
  ctx.fill();
  ctx.strokeStyle = '#241f18';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // 握把
  fillRoundRect(ctx, -10, -4, 14, 8, 2.5, '#3a2a22');
  ctx.strokeStyle = 'rgba(20,13,9,0.9)';
  ctx.lineWidth = 1.2;
  for (let i = -7; i <= 2; i += 2.6) {
    ctx.beginPath();
    ctx.moveTo(i, -3.4);
    ctx.lineTo(i + 1, 3.4);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(-12.6, 0, 4, 0, TAU);
  ctx.fillStyle = frost ? '#8fd8ef' : '#b99054';
  ctx.fill();
  ctx.strokeStyle = '#4e3a22';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawSpear(ctx, x, y, angle, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = 'rgba(124,242,255,0.9)';
    ctx.shadowBlur = 14 * glow;
  }
  // 枪杆
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(-14, -2.4, 128, 4.8);
  ctx.strokeStyle = '#190f08';
  ctx.lineWidth = 1;
  ctx.strokeRect(-14, -2.4, 128, 4.8);
  ctx.fillStyle = 'rgba(200,160,110,0.35)';
  ctx.fillRect(-14, -2.4, 128, 1.2);
  // 缠绳
  ctx.strokeStyle = 'rgba(24,16,10,0.85)';
  ctx.lineWidth = 1.6;
  for (let i = -6; i < 8; i += 3) {
    ctx.beginPath();
    ctx.moveTo(i, -2.6);
    ctx.lineTo(i + 1.4, 2.6);
    ctx.stroke();
  }
  // 枪头
  ctx.beginPath();
  ctx.moveTo(112, -5.4);
  ctx.lineTo(140, 0);
  ctx.lineTo(112, 5.4);
  ctx.lineTo(104, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(104, -5, 140, 5);
  g.addColorStop(0, '#f4fdff');
  g.addColorStop(0.5, '#a9c0c6');
  g.addColorStop(1, '#5c7077');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#0a1114';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 缨穗
  ctx.strokeStyle = 'rgba(180,70,60,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(106, 0);
  ctx.lineTo(96, -6);
  ctx.moveTo(106, 0);
  ctx.lineTo(96, 6);
  ctx.stroke();
  ctx.restore();
}

function drawAxe(ctx, x, y, angle, glow, doubleBit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = 'rgba(124,242,255,0.9)';
    ctx.shadowBlur = 14 * glow;
  }
  // 柄
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(-10, -2.8, 74, 5.6);
  ctx.strokeStyle = '#180f08';
  ctx.lineWidth = 1;
  ctx.strokeRect(-10, -2.8, 74, 5.6);
  // 斧刃
  const bladeG = ctx.createLinearGradient(44, -26, 78, 26);
  bladeG.addColorStop(0, '#e8f3f5');
  bladeG.addColorStop(0.45, '#96a9b0');
  bladeG.addColorStop(1, '#3e4f56');
  ctx.beginPath();
  ctx.moveTo(46, -24);
  ctx.quadraticCurveTo(78, -12, 76, 0);
  ctx.quadraticCurveTo(78, 12, 46, 24);
  ctx.quadraticCurveTo(54, 0, 46, -24);
  ctx.closePath();
  ctx.fillStyle = bladeG;
  ctx.fill();
  ctx.strokeStyle = '#0a1013';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (doubleBit) {
    ctx.beginPath();
    ctx.moveTo(46, -24);
    ctx.quadraticCurveTo(20, -14, 20, 0);
    ctx.quadraticCurveTo(20, 14, 46, 24);
    ctx.quadraticCurveTo(34, 0, 46, -24);
    ctx.closePath();
    ctx.fillStyle = bladeG;
    ctx.fill();
    ctx.stroke();
  }
  // 箍
  ctx.fillStyle = '#8a7444';
  ctx.fillRect(42, -5, 5, 10);
  ctx.restore();
}

function drawHammer(ctx, x, y, angle, glow, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = 'rgba(255,190,120,0.85)';
    ctx.shadowBlur = 14 * glow;
  }
  // 柄
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(-12, -3, 68, 6);
  ctx.strokeStyle = '#180f08';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, -3, 68, 6);
  ctx.fillStyle = 'rgba(200,160,110,0.3)';
  ctx.fillRect(-12, -3, 68, 1.4);

  if (kind === 'flail') {
    // 铁链 + 带刺球
    ctx.strokeStyle = '#6d6a60';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(52 + i * 7, 0, 4, 0, TAU);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(80, -4, 2, 82, 0, 15);
    g.addColorStop(0, '#aab4b8');
    g.addColorStop(0.5, '#5b666c');
    g.addColorStop(1, '#232b30');
    ctx.beginPath();
    ctx.arc(82, 0, 13, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#0b1013';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.strokeStyle = '#2a3338';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(82 + Math.cos(a) * 12, Math.sin(a) * 12);
      ctx.lineTo(82 + Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // 锤头
  const headW = kind === 'warhammer' ? 30 : 24;
  const headH = kind === 'warhammer' ? 30 : 22;
  const g2 = ctx.createLinearGradient(50, -headH / 2, 50 + headW, headH / 2);
  g2.addColorStop(0, '#b9c4c8');
  g2.addColorStop(0.5, '#6e7b82');
  g2.addColorStop(1, '#2a3338');
  fillRoundRect(ctx, 50, -headH / 2, headW, headH, 4, '#6e7b82');
  ctx.fillStyle = g2;
  ctx.fillRect(50, -headH / 2, headW, headH);
  ctx.strokeStyle = '#0b1013';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(50, -headH / 2, headW, headH);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(52, -headH / 2 + 2, headW - 4, 2);
  // 锤头尖刺
  ctx.fillStyle = '#9aa6ab';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(50 + headW / 2 + i * 8, -headH / 2 - 1);
    ctx.lineTo(50 + headW / 2 + i * 8 + 3, -headH / 2 - 9);
    ctx.lineTo(50 + headW / 2 + i * 8 + 6, -headH / 2 - 1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawTorch(ctx, x, y, angle, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // 手柄
  ctx.fillStyle = '#3c2a1c';
  ctx.fillRect(-8, -2.6, 46, 5.2);
  ctx.strokeStyle = '#150d07';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -2.6, 46, 5.2);
  // 缠布
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(28, -4, 12, 8);
  ctx.strokeStyle = 'rgba(20,12,8,0.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(28, -4, 12, 8);
  ctx.restore();

  // 火焰在世界坐标里向上,不跟着挥动旋转
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.translate(40, 0);
  ctx.rotate(-angle);
  ctx.globalCompositeOperation = 'lighter';
  drawFlameTongue(ctx, 0, -2, 6, 22 + Math.sin(t * 9) * 3, t, 3.7, 'rgba(255,250,205,0.95)', 'rgba(255,140,50,0.85)');
  drawFlameTongue(ctx, 0, -4, 3.4, 14, t, 6.2, 'rgba(255,255,255,1)', 'rgba(255,210,120,0.9)');
  ctx.restore();
}

function drawStaff(ctx, x, y, angle, glow, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 16 * glow;
  }
  // 法杖杆
  ctx.fillStyle = '#4a3524';
  ctx.fillRect(-14, -2.2, 116, 4.4);
  ctx.strokeStyle = '#160e08';
  ctx.lineWidth = 1;
  ctx.strokeRect(-14, -2.2, 116, 4.4);
  // 缠绕藤蔓
  ctx.strokeStyle = 'rgba(90,120,90,0.7)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    ctx.moveTo(-8 + i * 14, -2.2);
    ctx.quadraticCurveTo(-4 + i * 14, 0, -8 + i * 14, 2.2);
  }
  ctx.stroke();
  // 顶端爪
  ctx.strokeStyle = '#7a6a52';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(100, 0);
  ctx.quadraticCurveTo(112, -10, 118, -4);
  ctx.moveTo(100, 0);
  ctx.quadraticCurveTo(112, 10, 118, 4);
  ctx.stroke();
  // 宝石
  const g = ctx.createRadialGradient(108, 0, 1, 108, 0, 9);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(108, 0, 9, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(108, 0, 4.2, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawBow(ctx, x, y, angle, glow, crossbow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = 'rgba(124,242,255,0.85)';
    ctx.shadowBlur = 12 * glow;
  }
  if (crossbow) {
    // 弩身
    ctx.fillStyle = '#4a3524';
    ctx.fillRect(-8, -3, 62, 6);
    ctx.strokeStyle = '#160e08';
    ctx.lineWidth = 1;
    ctx.strokeRect(-8, -3, 62, 6);
    // 弩臂
    ctx.strokeStyle = '#8a7444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, -18);
    ctx.quadraticCurveTo(52, 0, 40, 18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,240,240,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, -18);
    ctx.lineTo(40, 18);
    ctx.stroke();
    // 弩箭
    ctx.fillStyle = '#c9d6d9';
    ctx.fillRect(42, -1.2, 26, 2.4);
    ctx.beginPath();
    ctx.moveTo(68, -4);
    ctx.lineTo(76, 0);
    ctx.lineTo(68, 4);
    ctx.closePath();
    ctx.fill();
  } else {
    // 弓身
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.arc(-4, 0, 32, -1.18, 1.18);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(210,180,130,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-6, 0, 32, -1.18, 1.18);
    ctx.stroke();
    // 弓弦
    ctx.strokeStyle = 'rgba(235,245,245,0.8)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(8.6, -30);
    ctx.lineTo(8.6, 30);
    ctx.stroke();
    // 握把
    fillRoundRect(ctx, -8, -4, 10, 8, 2, '#3a2a22');
  }
  ctx.restore();
}

function drawBoomerang(ctx, x, y, angle, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = 'rgba(124,242,255,0.85)';
    ctx.shadowBlur = 12 * glow;
  }
  const g = ctx.createLinearGradient(0, -18, 34, 10);
  g.addColorStop(0, '#e6f2f3');
  g.addColorStop(0.5, '#98abb1');
  g.addColorStop(1, '#3f5057');
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.quadraticCurveTo(22, -26, 40, -8);
  ctx.lineTo(30, 0);
  ctx.quadraticCurveTo(18, -14, 8, 2);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#0a1013';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.quadraticCurveTo(14, -10, 24, -2);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawSaw(ctx, x, y, angle, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (glow > 0) {
    ctx.shadowColor = 'rgba(255,120,110,0.85)';
    ctx.shadowBlur = 14 * glow;
  }
  // 锯身
  ctx.beginPath();
  ctx.moveTo(6, -5);
  ctx.lineTo(66, -5);
  ctx.lineTo(72, 0);
  ctx.lineTo(66, 5);
  ctx.lineTo(6, 5);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -5, 0, 5);
  g.addColorStop(0, '#e8f2f4');
  g.addColorStop(0.5, '#8fa2a8');
  g.addColorStop(1, '#43555c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#0b1114';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 锯齿
  ctx.fillStyle = '#d8e6e9';
  for (let i = 0; i < 9; i++) {
    const bx = 10 + i * 6.4;
    ctx.beginPath();
    ctx.moveTo(bx, -5);
    ctx.lineTo(bx + 3, -10);
    ctx.lineTo(bx + 6.4, -5);
    ctx.closePath();
    ctx.fill();
  }
  // 握把
  fillRoundRect(ctx, -10, -4, 14, 8, 2.5, '#3a2a22');
  ctx.strokeStyle = 'rgba(200,60,50,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(6, 2);
  ctx.lineTo(66, 2);
  ctx.stroke();
  ctx.restore();
}

/* 统一入口:根据武器 id 选择模型 */
function drawWeapon(ctx, def, x, y, angle, glow, t) {
  const id = def ? def.id : 'balanced';
  const tt = t || 0;
  switch (id) {
    case 'greatsword':
      drawBigSword(ctx, x, y, angle, glow, false);
      break;
    case 'frostgreatsword':
      drawBigSword(ctx, x, y, angle, glow, true);
      break;
    case 'spear':
      drawSpear(ctx, x, y, angle, glow);
      break;
    case 'twinaxes':
      drawAxe(ctx, x, y, angle, glow, true);
      break;
    case 'flail':
    case 'mace':
    case 'warhammer':
      drawHammer(ctx, x, y, angle, glow, id);
      break;
    case 'torch':
      drawTorch(ctx, x, y, angle, tt);
      break;
    case 'firestaff':
      drawStaff(ctx, x, y, angle, glow, 'rgba(255,150,60,0.95)');
      break;
    case 'froststaff':
      drawStaff(ctx, x, y, angle, glow, 'rgba(140,225,255,0.95)');
      break;
    case 'warbow':
      drawBow(ctx, x, y, angle, glow, false);
      break;
    case 'heavycrossbow':
      drawBow(ctx, x, y, angle, glow, true);
      break;
    case 'boomerang':
      drawBoomerang(ctx, x, y, angle, glow);
      break;
    case 'bonesaw':
      drawSaw(ctx, x, y, angle, glow);
      break;
    default:
      drawSword(ctx, x, y, angle, glow);
      break;
  }
}

function drawFlameTongue(ctx, x, y, w, h, t, seed, colorInner, colorOuter) {
  const flick = Math.sin(t * 12 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 2.1) * 0.5;
  const sway = Math.sin(t * 9 + seed) * w * 0.18;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.5, x - w * 0.05 + sway, y - h * (0.9 + flick * 0.1));
  ctx.quadraticCurveTo(x + w * 0.45, y - h * 0.45, x + w * 0.9, y);
  ctx.quadraticCurveTo(x, y + h * 0.3, x - w, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y - h);
  g.addColorStop(0, colorOuter);
  g.addColorStop(1, colorInner);
  ctx.fillStyle = g;
  ctx.fill();
}

/* =========================================================
   重生细胞风格:燃烧头颅(The Beheaded)
   淡骨色颅骨 + 深色兜帽 + 蓝白灵火
   ========================================================= */
function drawPlayerHead(ctx, hx, hy, t, facing) {
  ctx.save();
  ctx.translate(hx, hy);

  const breathe = 0.5 + Math.sin(t * 3.1) * 0.5;

  /* ---- 外圈灵光(先画,压在火焰下面) ---- */
  if (!PX_SIL) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const aura = ctx.createRadialGradient(0, -14, 2, 0, -14, 42 + breathe * 5);
    aura.addColorStop(0, 'rgba(140,255,250,0.5)');
    aura.addColorStop(0.34, 'rgba(45,210,215,0.2)');
    aura.addColorStop(0.72, 'rgba(20,150,175,0.07)');
    aura.addColorStop(1, 'rgba(10,120,150,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -14, 44 + breathe * 5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ---- 颈口:断裂的颈椎 + 灼烧环 ---- */
  ctx.beginPath();
  ctx.ellipse(0, 12, 8.5, 4.2, 0, 0, TAU);
  ctx.fillStyle = '#0a1114';
  ctx.fill();
  if (!PX_SIL) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(120,245,240,${0.4 + breathe * 0.3})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 11, 9.6, 4.7, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  /* ---- 脑后发团:蓬松白发,撑出饱满轮廓 ---- */
  ctx.beginPath();
  ctx.moveTo(-13, 6);
  ctx.quadraticCurveTo(-18, -8, -11, -18);
  ctx.quadraticCurveTo(-3, -27, 7, -21);
  ctx.quadraticCurveTo(16, -12, 13, 5);
  ctx.quadraticCurveTo(0, 13, -13, 6);
  ctx.closePath();
  const hoodG = ctx.createLinearGradient(-14, -24, 12, 8);
  hoodG.addColorStop(0, '#f6f9fa');
  hoodG.addColorStop(0.42, '#d9e1e6');
  hoodG.addColorStop(0.8, '#a8b4bc');
  hoodG.addColorStop(1, '#6e7b85');
  ctx.fillStyle = hoodG;
  ctx.fill();
  ctx.strokeStyle = '#080e11';
  ctx.lineWidth = 1.7;
  ctx.stroke();

  /* ---- 面部:偏冷淡肤色,下颌略尖 ---- */
  ctx.beginPath();
  ctx.moveTo(-8.6, -5);
  ctx.quadraticCurveTo(-9.6, 4, -2.2, 9);
  ctx.quadraticCurveTo(4.4, 10.6, 8.4, 4);
  ctx.quadraticCurveTo(10.4, -4, 6.6, -9.4);
  ctx.quadraticCurveTo(-1.4, -13.6, -8.6, -5);
  ctx.closePath();
  const boneG = ctx.createLinearGradient(-8, -12, 8, 10);
  boneG.addColorStop(0, '#fcefdf');
  boneG.addColorStop(0.48, '#ecd8c2');
  boneG.addColorStop(1, '#b99c88');
  ctx.fillStyle = boneG;
  ctx.fill();
  ctx.strokeStyle = '#0d1214';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  /* ---- 刘海:锯齿白发压住额头 ---- */
  ctx.beginPath();
  ctx.moveTo(-11.8, -3.4);
  ctx.lineTo(-8.4, -14.6);
  ctx.lineTo(-5.4, -8.4);
  ctx.lineTo(-2.6, -17.6);
  ctx.lineTo(1.2, -9.2);
  ctx.lineTo(5, -16.6);
  ctx.lineTo(7.6, -7.2);
  ctx.lineTo(11.6, -11.4);
  ctx.lineTo(11.2, -1.6);
  ctx.quadraticCurveTo(2, -8, -11.8, -3.4);
  ctx.closePath();
  const bangG = ctx.createLinearGradient(-10, -18, 10, -2);
  bangG.addColorStop(0, '#ffffff');
  bangG.addColorStop(0.5, '#e8eef1');
  bangG.addColorStop(1, '#b9c5cc');
  ctx.fillStyle = bangG;
  ctx.fill();
  ctx.strokeStyle = '#0b1114';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  /* 颧骨与太阳穴硬边高光 */
  ctx.beginPath();
  ctx.moveTo(-6.6, -1.2);
  ctx.quadraticCurveTo(-2, -4.4, 3.6, -2.4);
  ctx.strokeStyle = 'rgba(255,252,244,0.55)';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  /* ---- 眼睛:深色眼线 + 青蓝瞳光 ---- */
  ctx.fillStyle = '#1a2226';
  ctx.beginPath();
  ctx.ellipse(-4.2, 0.6, 2.5, 2.9, -0.06, 0, TAU);
  ctx.ellipse(4.6, 0.6, 2.5, 2.9, 0.06, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#bff2f4';
  ctx.beginPath();
  ctx.ellipse(-3.8, 1, 1.1, 1.5, 0, 0, TAU);
  ctx.ellipse(5, 1, 1.1, 1.5, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(-4.3, 0, 0.7, 0, TAU);
  ctx.arc(4.5, 0, 0.7, 0, TAU);
  ctx.fill();

  /* ---- 眉 ---- */
  ctx.strokeStyle = '#7c8992';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6.6, -3.4);
  ctx.lineTo(-2.6, -4.1);
  ctx.moveTo(3, -4.1);
  ctx.lineTo(6.8, -3.4);
  ctx.stroke();

  /* ---- 嘴 ---- */
  ctx.strokeStyle = 'rgba(120,86,74,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1.2, 6);
  ctx.lineTo(2.6, 5.8);
  ctx.stroke();

  /* ---- 鬓角碎发 ---- */
  ctx.beginPath();
  ctx.moveTo(-10.6, -4.2);
  ctx.quadraticCurveTo(-14.4, 1.6, -11.6, 8.6);
  ctx.quadraticCurveTo(-10.2, 2.4, -8.6, 0.4);
  ctx.closePath();
  ctx.fillStyle = '#c8d2d8';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10.4, -4.6);
  ctx.quadraticCurveTo(13.8, 1.8, 10.6, 9);
  ctx.quadraticCurveTo(9.8, 2.6, 8.4, 0.2);
  ctx.closePath();
  ctx.fillStyle = '#c2ccd3';
  ctx.fill();

  /* ---- 耳侧青蓝微光(呼应场景冷色) ---- */
  if (!PX_SIL) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const auraG = ctx.createRadialGradient(0, -2, 2, 0, -2, 20 + breathe * 2);
    auraG.addColorStop(0, 'rgba(140,230,240,0.14)');
    auraG.addColorStop(1, 'rgba(90,180,220,0)');
    ctx.fillStyle = auraG;
    ctx.beginPath();
    ctx.arc(0, -2, 22 + breathe * 2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/* 腰间剑鞘:只画鞘与剑柄,不画刃 */
function drawSheathedSword(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 鞘身
  ctx.beginPath();
  ctx.moveTo(2, -3.6);
  ctx.lineTo(58, -2.4);
  ctx.lineTo(64, 0);
  ctx.lineTo(58, 2.6);
  ctx.lineTo(2, 3.8);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -3.8, 0, 3.8);
  g.addColorStop(0, '#36454b');
  g.addColorStop(0.42, '#1b262b');
  g.addColorStop(1, '#080e11');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#04080a';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // 鞘箍与鞘尾
  ctx.fillStyle = '#8a7444';
  ctx.fillRect(18, -3.6, 3, 7.2);
  ctx.fillRect(46, -3.2, 3, 6.6);
  ctx.beginPath();
  ctx.moveTo(58, -2.8);
  ctx.lineTo(64.4, 0);
  ctx.lineTo(58, 3);
  ctx.closePath();
  ctx.fillStyle = '#a68d54';
  ctx.fill();

  // 护手 + 握柄 + 配重
  ctx.beginPath();
  ctx.moveTo(-1.4, -8.4);
  ctx.lineTo(3.6, -8);
  ctx.lineTo(2.8, 8.4);
  ctx.lineTo(-2.2, 8);
  ctx.closePath();
  ctx.fillStyle = '#6b6350';
  ctx.fill();
  ctx.strokeStyle = '#241f18';
  ctx.lineWidth = 1;
  ctx.stroke();
  fillRoundRect(ctx, -13.4, -3, 12, 6, 2, '#3a2a22');
  ctx.strokeStyle = 'rgba(190,160,110,0.4)';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-12.4, -1.8, 10, 3.6);
  ctx.beginPath();
  ctx.arc(-15.4, 0, 3.2, 0, TAU);
  ctx.fillStyle = '#b99054';
  ctx.fill();
  ctx.strokeStyle = '#4e3a22';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/* 靴子:靴筒 + 鞋头 + 鞋底 + 包头铁片 */
function drawBoot(ctx, x, y, tilt, dark) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  ctx.beginPath();
  ctx.moveTo(-7.4, -16);
  ctx.lineTo(6.4, -16);
  ctx.lineTo(7.4, -6);
  ctx.lineTo(-7.4, -6);
  ctx.closePath();
  ctx.fillStyle = dark ? '#192229' : '#2a211a';
  ctx.fill();
  ctx.strokeStyle = '#080d10';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-8, -7);
  ctx.lineTo(12.4, -7);
  ctx.quadraticCurveTo(18.4, -5, 17.4, 1.4);
  ctx.lineTo(-8, 1.4);
  ctx.quadraticCurveTo(-11, -3, -8, -7);
  ctx.closePath();
  ctx.fillStyle = dark ? '#22303a' : '#33271e';
  ctx.fill();
  ctx.strokeStyle = '#080d10';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 鞋底
  ctx.fillStyle = '#0d1316';
  ctx.fillRect(-9, 1.4, 27, 3.2);

  // 包头铁片
  ctx.beginPath();
  ctx.moveTo(8, -6.4);
  ctx.lineTo(16.4, -4.2);
  ctx.lineTo(15.4, 0.2);
  ctx.lineTo(8, -0.8);
  ctx.closePath();
  ctx.fillStyle = dark ? '#6d7b82' : '#95a3a9';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(9.4, -5.2, 4.8, 1);

  // 绑带
  ctx.strokeStyle = 'rgba(14,20,24,0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-7, -12.6);
  ctx.lineTo(6.4, -12.6);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(ctx, p, game) {
  // 地面阴影
  ctx.save();
  ctx.globalAlpha = p.onGround ? 0.34 : 0.16;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2, 26, 6.5, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  /* 建模类型：角色整体先光栅化进低分辨率精灵层，再按最近邻放大贴回，
     线条由此变成硬边像素、渐变被压成色阶，得到《重生细胞》的精灵质感。 */
  /* 包围盒按剑的最大挥砍半径取:剑尖最长到握把外 76,挥到 -2.6rad 时剑尖还会绕到身后 */
  pxSprite(ctx, { x: p.x - 95, y: p.y - 170, w: 205, h: 200 }, (c) => {
    drawPlayerBody(c, p, game);
  }, { outline: true });
}

/* 角色本体：坐标系原点在脚下，局部 y 轴向上为负 */
function drawPlayerBody(ctx, p, game) {
  const t = game.time;
  const moving = p.state === 'run' && p.onGround;
  const air = !p.onGround && p.state !== 'roll';
  const phase = p.animT * (moving ? 12 : 3);
  const bob = moving ? Math.abs(Math.sin(phase)) * 2.2 - 1.1 : Math.sin(t * 2.1) * 1.1;

  ctx.save();
  ctx.translate(p.x, p.y);
  const rollProgress = p.rollT > 0 ? 1 - p.rollT / ROLL_DUR : 0;
  if (p.rollT > 0) {
    ctx.translate(0, -36);
    ctx.rotate(p.facing * rollProgress * TAU);
    ctx.translate(0, 36);
  }
  if (p.invuln > 0 && p.rollT <= 0) {
    ctx.globalAlpha = 0.72 + Math.sin(t * 45) * 0.22;
  }
  ctx.scale(p.facing, 1);

  const hipX = 0;
  const hipY = -44 + bob;
  const shoulderX = 1;
  const shoulderY = -68 + bob;
  const rolled = p.rollT > 0;
  /* 收刀状态:不在攻击动作时把剑背回身后 */
  const sheathed = p.attackT <= 0;

  // 攻击时的挥剑姿态;收刀时手臂自然下垂
  let gripX = 7;
  let gripY = -42 + bob;
  let swordAngle = -1.05;
  let glow = 0;
  if (p.attackT > 0) {
    swordAngle = p.attackAngle;
    gripX = shoulderX + Math.cos(swordAngle) * 24;
    gripY = shoulderY + Math.sin(swordAngle) * 24;
    glow = clamp(p.attackT / p.attackCfg.dur + 0.4, 0, 1);
  } else if (rolled) {
    gripX = 7;
    gripY = -40;
    swordAngle = 0.5;
  } else if (air) {
    gripX = 10;
    gripY = -50 + bob;
    swordAngle = 0.7;
  } else if (moving) {
    gripX = 8 + Math.sin(phase + Math.PI) * 3;
    gripY = -44 + bob;
    swordAngle = 0.7;
  }

  // 脚部位置
  let footF = { x: 8, y: 0 };
  let footB = { x: -7, y: 0 };
  if (rolled) {
    footF = { x: 15, y: -20 };
    footB = { x: -4, y: -16 };
  } else if (air) {
    footF = { x: 13, y: -16 };
    footB = { x: -11, y: -7 };
  } else if (moving) {
    const swingA = Math.sin(phase);
    const swingB = Math.sin(phase + Math.PI);
    footF = { x: swingA * 17, y: -Math.max(0, Math.sin(phase + 1.1)) * 11 };
    footB = { x: swingB * 17, y: -Math.max(0, Math.sin(phase + 1.1 + Math.PI)) * 11 };
  }

  const skin = '#cfa98b';
  const clothDark = '#1a242a';
  const leather = '#5a4030';
  const leatherDark = '#2b1d15';

  /* 收刀:刀剑挂左腰;长柄/远程武器背在身后 */
  const wdefNow = p.weaponDef();
  const swordIds = ['balanced', 'twinblades', 'dagger', 'thunderblade'];
  const isSword = swordIds.indexOf(wdefNow.id) >= 0;
  if (sheathed) {
    if (isSword) {
      drawSheathedSword(ctx, -10, hipY + 1, -2.28);
    } else {
      drawWeapon(ctx, wdefNow, -4, hipY - 34, -2.05, 0, t);
    }
  }

  // 后腿
  const backKnee = solveIK(hipX - 4, hipY, footB.x, footB.y, 24, 25, -1);
  strokeLimb(ctx, hipX - 4, hipY, backKnee.x, backKnee.y, footB.x, footB.y, 12, '#2c3b43', '#0a0f12');
  /* 后腿绑腿与护膝 */
  ctx.strokeStyle = 'rgba(14,20,24,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hipX - 5.4, hipY + 12);
  ctx.lineTo(hipX - 6.6, hipY + 22);
  ctx.stroke();
  ctx.fillStyle = '#1a242a';
  ctx.beginPath();
  ctx.ellipse(backKnee.x, backKnee.y, 6.2, 5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,168,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawBoot(ctx, footB.x, footB.y, clamp(footB.x * 0.01, -0.25, 0.25), true);

  // 后臂
  const backHand = { x: rolled ? -2 : -7, y: rolled ? -38 : -42 + bob };
  const backElbow = solveIK(shoulderX - 3, shoulderY + 3, backHand.x, backHand.y, 18, 17, 1);
  strokeLimb(ctx, shoulderX - 3, shoulderY + 3, backElbow.x, backElbow.y, backHand.x, backHand.y, 9, '#24323a', '#0a1014');
  ctx.fillStyle = '#b9927a';
  ctx.beginPath();
  ctx.arc(backHand.x, backHand.y, 4.4, 0, TAU);
  ctx.fill();

  /* 副手小盾:不举盾时挂在左臂上 */
  if (!p.blockHeld) {
    ctx.save();
    ctx.translate(backHand.x - 5.5, backHand.y + 1);
    ctx.rotate(0.12);
    const r = 13.5;
    const sg2 = ctx.createLinearGradient(-r, -r, r, r);
    const shieldItem0 = p.gear && p.gear.shield;
    const sdef0 = shieldItem0 ? SHIELD_MAP[shieldItem0.defId] : null;
    sg2.addColorStop(0, sdef0 && sdef0.id === 'ironshield' ? '#9aa9ae' : '#6b7a80');
    sg2.addColorStop(0.5, '#38464c');
    sg2.addColorStop(1, '#141c20');
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = sg2;
    ctx.fill();
    ctx.strokeStyle = '#060b0d';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r - 3.4, 0, TAU);
    ctx.strokeStyle = 'rgba(190,215,218,0.32)';
    ctx.lineWidth = 1;
    ctx.stroke();
    /* 中心盾钉 */
    ctx.beginPath();
    ctx.arc(0, 0, 3.4, 0, TAU);
    ctx.fillStyle = '#b99054';
    ctx.fill();
    ctx.strokeStyle = '#4a3519';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 躯干
  ctx.beginPath();
  ctx.moveTo(-12, hipY - 2);
  ctx.quadraticCurveTo(-18, shoulderY + 12, -13, shoulderY + 1);
  ctx.quadraticCurveTo(-2, shoulderY - 5, 13, shoulderY + 4);
  ctx.quadraticCurveTo(18, hipY - 18, 11, hipY + 3);
  ctx.quadraticCurveTo(0, hipY + 10, -12, hipY - 2);
  ctx.closePath();
  const torsoG = ctx.createLinearGradient(-15, shoulderY, 15, hipY);
  torsoG.addColorStop(0, '#755239');
  torsoG.addColorStop(0.5, '#4f3627');
  torsoG.addColorStop(1, '#2b1e15');
  ctx.fillStyle = torsoG;
  ctx.fill();
  ctx.strokeStyle = '#120c09';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 胸前皮带
  ctx.strokeStyle = 'rgba(28,18,13,0.9)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-8, shoulderY + 4);
  ctx.lineTo(7, hipY - 10);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(180,140,96,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-8, shoulderY + 4);
  ctx.lineTo(7, hipY - 10);
  ctx.stroke();

  // 腰带
  ctx.fillStyle = '#2a1c13';
  ctx.fillRect(-12, hipY - 9, 24, 8);
  ctx.fillStyle = '#a9863f';
  ctx.fillRect(-3.2, hipY - 9.5, 6.4, 9);
  ctx.fillStyle = '#e0c780';
  ctx.fillRect(-1.6, hipY - 8, 3.2, 6);

  /* 腰侧皮袋(重生细胞的破烂装备感) */
  fillRoundRect(ctx, -17, hipY - 5, 10.5, 13, 2.5, '#3f2d1f');
  ctx.strokeStyle = '#150e08';
  ctx.lineWidth = 1;
  roundRectPath(ctx, -17, hipY - 5, 10.5, 13, 2.5);
  ctx.stroke();
  ctx.fillStyle = 'rgba(190,150,100,0.35)';
  ctx.fillRect(-15.6, hipY - 1.4, 8, 1.4);

  /* 胸口灵火裂纹:体内也有同一股蓝焰 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const veinA = 0.22 + Math.sin(t * 3.4) * 0.1;
  ctx.strokeStyle = `rgba(120,245,240,${veinA})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(2, shoulderY + 6);
  ctx.lineTo(-1.6, shoulderY + 20);
  ctx.lineTo(2.4, hipY - 14);
  ctx.moveTo(-1.6, shoulderY + 20);
  ctx.lineTo(-6, hipY - 20);
  ctx.stroke();
  ctx.restore();

  // 破布下摆
  ctx.beginPath();
  ctx.moveTo(-10, hipY + 2);
  ctx.lineTo(-13, hipY + 16);
  ctx.lineTo(-7, hipY + 11);
  ctx.lineTo(-4, hipY + 20);
  ctx.lineTo(1, hipY + 10);
  ctx.lineTo(6, hipY + 17);
  ctx.lineTo(9, hipY + 5);
  ctx.closePath();
  ctx.fillStyle = clothDark;
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,12,14,0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 前腿
  const frontKnee = solveIK(hipX + 3, hipY, footF.x, footF.y, 24, 25, -1);
  strokeLimb(ctx, hipX + 3, hipY, frontKnee.x, frontKnee.y, footF.x, footF.y, 13, '#405662', '#0a1014');

  /* 前腿:裤腿束带 + 护膝 + 胫甲 */
  ctx.strokeStyle = 'rgba(12,18,22,0.85)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(hipX + 2.2, hipY + 13);
  ctx.lineTo(hipX + 4.4, hipY + 23);
  ctx.stroke();
  ctx.fillStyle = '#222f36';
  ctx.beginPath();
  ctx.ellipse(frontKnee.x, frontKnee.y, 6.8, 5.4, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,190,198,0.35)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  // 胫甲高光
  ctx.beginPath();
  ctx.moveTo(frontKnee.x + 1.5, frontKnee.y + 5);
  ctx.lineTo(footF.x + 1, footF.y - 7);
  ctx.strokeStyle = 'rgba(160,205,214,0.28)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  drawBoot(ctx, footF.x, footF.y, clamp(footF.x * 0.01, -0.25, 0.25), false);

  // (肩甲已移除：保留光板肩膀的紧身剪影)

  // 前臂 + 剑
  const frontElbow = solveIK(shoulderX + 2, shoulderY + 4, gripX, gripY, 19, 18, 1);
  strokeLimb(ctx, shoulderX + 2, shoulderY + 4, frontElbow.x, frontElbow.y, gripX, gripY, 10, '#4c6169', '#0b1216');

  // 护腕
  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(swordAngle);
  fillRoundRect(ctx, -13, -5, 12, 10, 3, '#25343b');
  ctx.strokeStyle = '#0e171b';
  ctx.lineWidth = 1;
  roundRectPath(ctx, -13, -5, 12, 10, 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,220,225,0.35)';
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.lineTo(-11, 3);
  ctx.stroke();
  ctx.restore();

  // 手
  ctx.fillStyle = '#c49b7d';
  ctx.beginPath();
  ctx.arc(gripX, gripY, 4.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,25,18,0.6)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  if (!sheathed) drawWeapon(ctx, wdefNow, gripX, gripY, swordAngle, glow, t);

  // 剑光轨迹
  if (p.attackT > 0 && p.trail.length > 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < p.trail.length; i++) {
      const a = p.trail[i - 1];
      const b = p.trail[i];
      const alpha = clamp(1 - b.age / 0.16, 0, 1) * 0.55;
      if (alpha <= 0) continue;
      ctx.strokeStyle = `rgba(140,245,255,${alpha})`;
      ctx.lineWidth = 1 + i * 0.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 头部
  drawPlayerHead(ctx, 2, -90 + bob, t, p.facing);

  /* 颈间破围巾:只留贴身一圈,不再拖出飘带 */
  {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-10, -80 + bob);
    ctx.quadraticCurveTo(0, -75 + bob, 11, -81 + bob);
    ctx.quadraticCurveTo(10, -71 + bob, 0, -69 + bob);
    ctx.quadraticCurveTo(-9, -70 + bob, -10, -80 + bob);
    ctx.closePath();
    const sg = ctx.createLinearGradient(-11, -82 + bob, 11, -69 + bob);
    sg.addColorStop(0, '#6a3733');
    sg.addColorStop(0.55, '#3f1f1d');
    sg.addColorStop(1, '#1d0e0e');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = '#120809';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  /* 举盾:身前弧形护盾;完美格挡窗口内高亮 */
  if (p.blockHeld && !rolled) {
    const shieldItem = p.gear && p.gear.shield;
    const sdef = shieldItem ? SHIELD_MAP[shieldItem.defId] : null;
    if (sdef) {
      const perfect = p.blockT <= sdef.parry;
      ctx.save();
      ctx.translate(24, -46 + bob);
      const g = ctx.createLinearGradient(-6, -34, 16, 34);
      g.addColorStop(0, perfect ? 'rgba(190,248,255,0.95)' : 'rgba(150,180,185,0.9)');
      g.addColorStop(0.5, perfect ? 'rgba(110,220,245,0.8)' : 'rgba(96,124,130,0.92)');
      g.addColorStop(1, perfect ? 'rgba(60,150,190,0.85)' : 'rgba(52,72,78,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-3, -34);
      ctx.quadraticCurveTo(14, -30, 14, 0);
      ctx.quadraticCurveTo(14, 30, -3, 34);
      ctx.quadraticCurveTo(4, 0, -3, -34);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = perfect ? 'rgba(200,250,255,0.95)' : 'rgba(180,205,208,0.55)';
      ctx.lineWidth = perfect ? 2 : 1.2;
      ctx.stroke();
      // 盾面铆钉
      ctx.fillStyle = perfect ? '#d9fbff' : 'rgba(210,225,228,0.7)';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(4, i * 16, 1.9, 0, TAU);
        ctx.fill();
      }
      if (perfect) {
        ctx.globalAlpha = 0.5 + Math.sin(t * 30) * 0.25;
        ctx.strokeStyle = 'rgba(160,245,255,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(6, 0, 40, -1.1, 1.1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 前臂袖口高光
  ctx.beginPath();
  ctx.moveTo(shoulderX + 4, shoulderY + 6);
  ctx.lineTo(frontElbow.x, frontElbow.y);
  ctx.strokeStyle = 'rgba(150,220,225,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  /* 轮廓光:迎光侧一道冷色硬边,拉开与背景的层次 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(150,215,220,0.35)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, hipY + 1);
  ctx.quadraticCurveTo(-15, shoulderY + 16, -10, shoulderY + 1);
  ctx.quadraticCurveTo(2, shoulderY - 5, 11, shoulderY + 3);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,215,220,0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(footB.x - 2, footB.y - 2);
  ctx.lineTo(backKnee.x, backKnee.y);
  ctx.moveTo(footF.x + 2, footF.y - 3);
  ctx.lineTo(frontKnee.x, frontKnee.y);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
