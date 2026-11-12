'use strict';

/* =========================================================
   敌人绘制
   ========================================================= */
function drawEnemyShadow(ctx, e, alpha, scale) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(e.x, GROUND_Y + 2, (e.w * 0.55) * (scale || 1), 6, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawEnemyBar(ctx, e) {
  if (e.dead || e.type === 'boss') return;
  if (e.hpShow <= 0 && e.hp >= e.maxHp) return;
  const w = e.w + 14;
  const x = e.x - w / 2;
  const y = e.y - e.h - 14;
  ctx.save();
  ctx.globalAlpha = clamp(e.hpShow > 0 ? 1 : 0.55, 0, 1);
  fillRoundRect(ctx, x, y, w, 5, 2.5, 'rgba(4,10,12,0.85)');
  const ratio = clamp(e.hp / e.maxHp, 0, 1);
  fillRoundRect(ctx, x, y, w * ratio, 5, 2.5, 'rgba(226,84,90,0.95)');
  ctx.restore();
}

function drawWindupMark(ctx, e, t) {
  if (e.dead) return;
  if (e.state !== 'windup' && e.state !== 'slamWind' && e.state !== 'chargeWind') return;
  const y = e.y - e.h - 24;
  const pulse = 1 + Math.sin(t * 18) * 0.12;
  ctx.save();
  ctx.translate(e.x, y);
  ctx.scale(pulse, pulse);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(255,92,92,0.95)';
  pxShadow(ctx, 'rgba(255,60,60,0.9)', 10);
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

function drawHusk(ctx, e, t) {
  const walk = clamp(Math.abs(e.vx) / 160, 0, 1);
  const ph = e.animT * 9;
  const bob = Math.abs(Math.sin(ph)) * 2 * walk;
  const windup = e.state === 'windup';
  const strike = e.state === 'strike';
  const lean = windup ? -0.08 : (strike ? 0.18 : 0);

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing, 1);

  const hipY = -30 + bob;
  const shoulderY = -52 + bob;

  // 腿
  const swingA = Math.sin(ph) * 9 * walk;
  const swingB = Math.sin(ph + Math.PI) * 9 * walk;
  strokeLimb(ctx, -3, hipY, -6 + swingB * 0.4, -14, -7 + swingB, 0, 7, '#5c6b5d', '#141b16');
  strokeLimb(ctx, 3, hipY, 4 + swingA * 0.4, -14, 6 + swingA, 0, 7.5, '#6d7d6d', '#141b16');

  // 后臂
  ctx.save();
  ctx.rotate(lean);
  const backArmY = windup ? -58 : -30;
  ctx.strokeStyle = '#44503f';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, shoulderY + 2);
  ctx.lineTo(-15, windup ? -50 : -30);
  ctx.lineTo(-20, backArmY);
  ctx.stroke();
  ctx.strokeStyle = '#2b3226';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, backArmY - 4);
  ctx.lineTo(-26, backArmY + 2);
  ctx.stroke();

  // 躯干（破烂衣物）
  ctx.beginPath();
  ctx.moveTo(-12, hipY + 2);
  ctx.quadraticCurveTo(-16, -42, -9, shoulderY - 2);
  ctx.quadraticCurveTo(0, shoulderY - 8, 10, shoulderY - 1);
  ctx.quadraticCurveTo(15, -38, 10, hipY + 3);
  ctx.quadraticCurveTo(0, hipY + 8, -12, hipY + 2);
  ctx.closePath();
  const bg = ctx.createLinearGradient(-12, shoulderY, 12, hipY);
  bg.addColorStop(0, '#54654f');
  bg.addColorStop(0.6, '#35422f');
  bg.addColorStop(1, '#1c241a');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#0b1009';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 肋骨
  ctx.strokeStyle = 'rgba(190,205,170,0.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const ry = shoulderY + 10 + i * 6;
    ctx.beginPath();
    ctx.moveTo(-7, ry);
    ctx.quadraticCurveTo(0, ry + 2, 7, ry - 1);
    ctx.stroke();
  }

  // 破布边缘
  ctx.fillStyle = '#232b1f';
  ctx.beginPath();
  ctx.moveTo(-11, hipY + 2);
  ctx.lineTo(-14, hipY + 14);
  ctx.lineTo(-6, hipY + 8);
  ctx.lineTo(-2, hipY + 16);
  ctx.lineTo(4, hipY + 6);
  ctx.lineTo(9, hipY + 12);
  ctx.lineTo(10, hipY + 3);
  ctx.closePath();
  ctx.fill();

  // 前臂
  const armLift = windup ? -62 : (strike ? -30 : -34);
  const armOut = windup ? 6 : (strike ? 26 : 14);
  ctx.strokeStyle = '#61705a';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, shoulderY + 3);
  ctx.lineTo(14, -40);
  ctx.lineTo(18 + armOut, armLift + 6);
  ctx.stroke();
  ctx.strokeStyle = '#151a12';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(18 + armOut, armLift + 4);
  ctx.lineTo(24 + armOut, armLift + 10);
  ctx.moveTo(19 + armOut, armLift + 1);
  ctx.lineTo(26 + armOut, armLift + 4);
  ctx.stroke();

  // 头骨(腐烂囚徒:破损面罩 + 外露下颌 + 橙色眼火)
  ctx.save();
  ctx.translate(9 + lean * 20, shoulderY - 12);
  ctx.rotate(0.12 + lean);

  // 头皮溃烂面
  ctx.beginPath();
  ctx.ellipse(0, 0, 10.5, 11.5, 0, 0, TAU);
  const hg = ctx.createLinearGradient(-9, -11, 9, 11);
  hg.addColorStop(0, '#9aa88c');
  hg.addColorStop(0.45, '#6d7a63');
  hg.addColorStop(1, '#39422f');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = '#161c12';
  ctx.lineWidth = 1.3;
  ctx.stroke();

  // 嘴角撕裂 + 外露牙齿
  ctx.beginPath();
  ctx.moveTo(-7, 4.6);
  ctx.quadraticCurveTo(0, 13.4, 7.4, 4);
  ctx.quadraticCurveTo(2, 9.6, -7, 4.6);
  ctx.closePath();
  ctx.fillStyle = '#1b120f';
  ctx.fill();
  ctx.fillStyle = 'rgba(226,215,190,0.85)';
  for (let i = -5; i <= 5; i += 2.1) {
    ctx.beginPath();
    ctx.moveTo(i, 5.4);
    ctx.lineTo(i + 1, 8.6);
    ctx.lineTo(i + 1.8, 5.6);
    ctx.closePath();
    ctx.fill();
  }

  // 铁质颚箍(囚徒刑具)
  ctx.strokeStyle = '#6a6252';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.quadraticCurveTo(0, 9.6, 9, 3.4);
  ctx.stroke();
  ctx.fillStyle = '#8b7f63';
  ctx.beginPath();
  ctx.arc(-8.4, 4.2, 1.5, 0, TAU);
  ctx.arc(8.4, 3.6, 1.5, 0, TAU);
  ctx.fill();

  // 深陷眼窝 + 熔岩色眼
  ctx.fillStyle = '#0d0a08';
  ctx.beginPath();
  ctx.ellipse(3.4, -2.6, 4.4, 3.4, -0.15, 0, TAU);
  ctx.ellipse(-3.6, -2.6, 4.4, 3.4, 0.15, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const eg = ctx.createRadialGradient(0, -2, 0.6, 0, -2, 8);
  eg.addColorStop(0, 'rgba(255,240,190,1)');
  eg.addColorStop(0.4, 'rgba(255,160,70,0.9)');
  eg.addColorStop(1, 'rgba(255,110,40,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(3.4, -2.4, 3.2, 2.4, -0.1, 0, TAU);
  ctx.ellipse(-3.6, -2.4, 3.2, 2.4, 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();

  // 额前缝线
  ctx.strokeStyle = 'rgba(28,32,22,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -8.6);
  ctx.lineTo(-1, -10.4);
  ctx.moveTo(1, -10.6);
  ctx.lineTo(6, -8.8);
  ctx.stroke();
  ctx.restore();

  /* 手腕镣铐 */
  ctx.save();
  ctx.strokeStyle = '#5c584a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(24 + armOut, armLift + 8, 4.4, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#7a7260';
  ctx.beginPath();
  ctx.arc(24 + armOut, armLift + 8, 1.4, 0, TAU);
  ctx.fill();
  ctx.restore();

  /* 顶部轮廓光 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(190,220,170,0.28)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-9, hipY + 2);
  ctx.quadraticCurveTo(-16, -42, -9, shoulderY - 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.restore();

  if (e.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = e.hitFlash * 3.2;
    ctx.fillStyle = '#fff';
    fillRoundRect(ctx, e.x - e.w / 2, e.y - e.h, e.w, e.h, 12, '#fff');
    ctx.restore();
  }
}

function drawShield(ctx, e, t) {
  const walking = clamp(Math.abs(e.vx) / 90, 0, 1);
  const ph = e.animT * 6;
  const bob = Math.abs(Math.sin(ph)) * 1.5 * walking;
  const windup = e.state === 'windup';
  const strike = e.state === 'strike';

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing, 1);

  const shoulderY = -56 + bob;
  const hipY = -32 + bob;

  // 腿
  ctx.strokeStyle = '#39454b';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, hipY);
  ctx.lineTo(-11, -14);
  ctx.lineTo(-12 + Math.sin(ph) * 7 * walking, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(5, hipY);
  ctx.lineTo(10, -14);
  ctx.lineTo(12 + Math.sin(ph + Math.PI) * 7 * walking, 0);
  ctx.stroke();
  ctx.fillStyle = '#1a2124';
  ctx.beginPath();
  ctx.ellipse(-12 + Math.sin(ph) * 7 * walking, -3, 8, 5, 0, 0, TAU);
  ctx.ellipse(12 + Math.sin(ph + Math.PI) * 7 * walking, -3, 8, 5, 0, 0, TAU);
  ctx.fill();

  // 躯干
  ctx.beginPath();
  ctx.moveTo(-15, hipY + 2);
  ctx.quadraticCurveTo(-20, shoulderY + 14, -14, shoulderY);
  ctx.quadraticCurveTo(0, shoulderY - 7, 14, shoulderY + 2);
  ctx.quadraticCurveTo(18, hipY - 10, 12, hipY + 4);
  ctx.quadraticCurveTo(0, hipY + 10, -15, hipY + 2);
  ctx.closePath();
  const bg = ctx.createLinearGradient(-16, shoulderY, 16, hipY);
  bg.addColorStop(0, '#596a72');
  bg.addColorStop(0.45, '#34434a');
  bg.addColorStop(1, '#141d22');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#070d10';
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // 腰带 / 金属甲片
  ctx.fillStyle = '#20292e';
  ctx.fillRect(-14, hipY - 7, 28, 7);
  ctx.fillStyle = '#7b6a43';
  ctx.fillRect(-3, hipY - 8, 6, 9);

  // 肩甲
  ctx.beginPath();
  ctx.ellipse(-10, shoulderY + 6, 10, 8, -0.2, 0, TAU);
  ctx.fillStyle = '#5b6b72';
  ctx.fill();
  ctx.strokeStyle = '#10171a';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 头盔
  ctx.save();
  ctx.translate(6, shoulderY - 12);
  ctx.beginPath();
  ctx.moveTo(-10, 10);
  ctx.quadraticCurveTo(-14, -8, -4, -15);
  ctx.quadraticCurveTo(8, -18, 13, -6);
  ctx.quadraticCurveTo(15, 6, 8, 12);
  ctx.quadraticCurveTo(-2, 15, -10, 10);
  ctx.closePath();
  ctx.fillStyle = '#46565e';
  ctx.fill();
  ctx.strokeStyle = '#0a1114';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 面甲缝隙
  ctx.fillStyle = '#060a0b';
  ctx.fillRect(-2, -1, 11, 3);
  ctx.fillStyle = 'rgba(255,96,96,0.95)';
  pxShadow(ctx, 'rgba(255,70,70,0.9)', 7);
  ctx.fillRect(2, -0.6, 3, 1.6);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.shadowBlur = 0;
  ctx.fillRect(-8, -10, 3, 12);
  ctx.restore();

  // 盾牌(厚重塔盾:多层包边 + 中央纹章)
  const shieldOffset = strike ? 13 : (windup ? -4 : 5);
  ctx.save();
  ctx.translate(25 + shieldOffset, -42);
  ctx.rotate(strike ? -0.12 : 0.06);

  // 盾体
  ctx.beginPath();
  ctx.moveTo(-11, -27);
  ctx.quadraticCurveTo(0, -32, 11, -27);
  ctx.lineTo(12, 14);
  ctx.quadraticCurveTo(0, 28, -12, 14);
  ctx.closePath();
  const sg = ctx.createLinearGradient(-12, -28, 12, 26);
  sg.addColorStop(0, '#93a3a8');
  sg.addColorStop(0.35, '#4f5e64');
  sg.addColorStop(0.72, '#232d32');
  sg.addColorStop(1, '#0f161a');
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = '#050b0e';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 竖向包边
  ctx.strokeStyle = 'rgba(185,205,205,0.4)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6.5, -25);
  ctx.quadraticCurveTo(-8, 0, -7, 18);
  ctx.moveTo(6.5, -25);
  ctx.quadraticCurveTo(8, 0, 7, 18);
  ctx.stroke();

  // 横向铁箍
  ctx.fillStyle = '#5d6a70';
  ctx.fillRect(-11.5, -12, 23, 3.4);
  ctx.fillRect(-11, 10, 22, 3);
  ctx.strokeStyle = 'rgba(10,16,18,0.8)';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-11.5, -12, 23, 3.4);
  ctx.strokeRect(-11, 10, 22, 3);

  // 纹章(锈金菱形)
  ctx.fillStyle = 'rgba(220,170,95,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 8);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,26,0.9)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 铆钉
  ctx.fillStyle = 'rgba(210,225,228,0.75)';
  for (const p of [[-8, -24], [8, -24], [-9, 17], [9, 17]]) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 1.5, 0, TAU);
    ctx.fill();
  }

  // 高光
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(200,230,235,0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -24);
  ctx.quadraticCurveTo(-9, 0, -7.5, 16);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // 握盾手臂
  ctx.strokeStyle = '#4b5c63';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, shoulderY + 6);
  ctx.lineTo(16, -47);
  ctx.lineTo(23 + shieldOffset, -44);
  ctx.stroke();

  // 武器（短锤）
  ctx.save();
  ctx.translate(windup ? -10 : 16, windup ? -58 : -38);
  ctx.rotate(windup ? -0.9 : 0.6);
  ctx.fillStyle = '#3b2a1e';
  ctx.fillRect(-2, 0, 4, 26);
  ctx.fillStyle = '#6d7780';
  ctx.fillRect(-7, 24, 14, 9);
  ctx.strokeStyle = '#0b0f11';
  ctx.lineWidth = 1;
  ctx.strokeRect(-7, 24, 14, 9);
  ctx.restore();

  /* 轮廓光 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(170,215,225,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-14, hipY + 2);
  ctx.quadraticCurveTo(-20, shoulderY + 14, -14, shoulderY);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  if (e.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = e.hitFlash * 3.2;
    fillRoundRect(ctx, e.x - e.w / 2, e.y - e.h, e.w, e.h, 12, '#fff');
    ctx.restore();
  }
}

function drawGrenadier(ctx, e, t) {
  const walk = clamp(Math.abs(e.vx) / 100, 0, 1);
  const ph = e.animT * 6.5;
  const bob = Math.abs(Math.sin(ph)) * 1.8 * walk;
  const windup = e.state === 'windup';

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing, 1);

  const hipY = -30 + bob;

  // 腿
  ctx.strokeStyle = '#3c3546';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, hipY);
  ctx.lineTo(-7, -13);
  ctx.lineTo(-9 + Math.sin(ph) * 6 * walk, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, hipY);
  ctx.lineTo(7, -13);
  ctx.lineTo(9 + Math.sin(ph + Math.PI) * 6 * walk, 0);
  ctx.stroke();

  // 长袍
  ctx.beginPath();
  ctx.moveTo(-9, -60);
  ctx.quadraticCurveTo(-19, -38, -18, 1);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-3, 2);
  ctx.lineTo(2, -7);
  ctx.lineTo(7, 2);
  ctx.lineTo(12, -6);
  ctx.lineTo(18, 1);
  ctx.quadraticCurveTo(18, -38, 9, -60);
  ctx.closePath();
  const rg = ctx.createLinearGradient(-16, -60, 16, 4);
  rg.addColorStop(0, '#4b4159');
  rg.addColorStop(0.55, '#2e2838');
  rg.addColorStop(1, '#17131f');
  ctx.fillStyle = rg;
  ctx.fill();
  ctx.strokeStyle = '#0a080e';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 腰带与挎包
  ctx.fillStyle = '#2c2119';
  ctx.fillRect(-14, -34, 28, 6);
  ctx.fillStyle = '#4a3423';
  fillRoundRect(ctx, -16, -30, 11, 12, 3, '#4a3423');
  ctx.strokeStyle = '#171009';
  ctx.lineWidth = 1;
  roundRectPath(ctx, -16, -30, 11, 12, 3);
  ctx.stroke();

  // 兜帽与头
  ctx.save();
  ctx.translate(1, -64);
  ctx.beginPath();
  ctx.moveTo(-13, 8);
  ctx.quadraticCurveTo(-16, -12, -2, -17);
  ctx.quadraticCurveTo(14, -14, 14, 7);
  ctx.quadraticCurveTo(3, 14, -13, 8);
  ctx.closePath();
  ctx.fillStyle = '#393245';
  ctx.fill();
  ctx.strokeStyle = '#0b0910';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(2, 1, 10, 8, 0, 0, TAU);
  ctx.fillStyle = '#0b0910';
  ctx.fill();
  // 护目镜
  ctx.fillStyle = 'rgba(146,240,160,0.95)';
  pxShadow(ctx, 'rgba(110,230,130,0.9)', 8);
  ctx.beginPath();
  ctx.arc(-3, 0, 2.6, 0, TAU);
  ctx.arc(6, 0, 2.6, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  /* 瘟疫医生喙嘴面具(重生细胞的掷弹兵气质) */
  ctx.beginPath();
  ctx.moveTo(6, -2.4);
  ctx.quadraticCurveTo(20, 2.4, 24, 7.4);
  ctx.quadraticCurveTo(15, 6.6, 5, 4.2);
  ctx.closePath();
  const beakG = ctx.createLinearGradient(4, -2, 24, 8);
  beakG.addColorStop(0, '#5a5163');
  beakG.addColorStop(0.6, '#3a3345');
  beakG.addColorStop(1, '#1a1620');
  ctx.fillStyle = beakG;
  ctx.fill();
  ctx.strokeStyle = '#0a080e';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,235,160,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, 0.4);
  ctx.quadraticCurveTo(17, 3.4, 22, 6.6);
  ctx.stroke();
  ctx.restore();

  // 手臂
  ctx.strokeStyle = '#3b3447';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, -56);
  ctx.lineTo(-16, -44);
  ctx.lineTo(-12, -34);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(9, -56);
  ctx.lineTo(16, windup ? -66 : -46);
  ctx.lineTo(windup ? 12 : 20, windup ? -78 : -34);
  ctx.stroke();

  // 手中的炸弹
  if (windup) {
    const pulse = 1 + Math.sin(t * 22) * 0.1;
    ctx.save();
    ctx.translate(12, -80);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#3a3f38';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,120,60,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  if (e.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = e.hitFlash * 3.2;
    fillRoundRect(ctx, e.x - e.w / 2, e.y - e.h, e.w, e.h, 12, '#fff');
    ctx.restore();
  }
}

function drawBat(ctx, e, t) {
  const flap = Math.sin(e.animT * 22);
  const dive = e.state === 'dive';

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing, 1);

  // 翅膀
  ctx.beginPath();
  ctx.moveTo(-3, -4);
  ctx.quadraticCurveTo(-20, -18 - flap * 8, -34, -4 - flap * 6);
  ctx.quadraticCurveTo(-26, -2, -22, 4);
  ctx.quadraticCurveTo(-16, -1, -12, 5);
  ctx.quadraticCurveTo(-8, 0, -3, 3);
  ctx.closePath();
  const wg = ctx.createLinearGradient(-34, -12, 0, 6);
  wg.addColorStop(0, '#4a2f4f');
  wg.addColorStop(0.55, '#2b1a30');
  wg.addColorStop(1, '#1a0f1e');
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.strokeStyle = '#0c060e';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3, -4);
  ctx.quadraticCurveTo(20, -18 - flap * 8, 34, -4 - flap * 6);
  ctx.quadraticCurveTo(26, -2, 22, 4);
  ctx.quadraticCurveTo(16, -1, 12, 5);
  ctx.quadraticCurveTo(8, 0, 3, 3);
  ctx.closePath();
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.strokeStyle = '#0c060e';
  ctx.stroke();

  // 身体
  ctx.beginPath();
  ctx.ellipse(0, 0, 7, 9, 0, 0, TAU);
  ctx.fillStyle = '#3a2540';
  ctx.fill();
  ctx.strokeStyle = '#0d0710';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 耳朵
  ctx.beginPath();
  ctx.moveTo(-4, -7);
  ctx.lineTo(-6, -14);
  ctx.lineTo(-1, -8);
  ctx.closePath();
  ctx.fillStyle = '#3a2540';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -7);
  ctx.lineTo(6, -14);
  ctx.lineTo(1, -8);
  ctx.closePath();
  ctx.fill();

  // 眼睛
  ctx.fillStyle = dive ? '#ff5b6e' : 'rgba(255,110,110,0.9)';
  pxShadow(ctx, 'rgba(255,60,80,0.95)', dive ? 10 : 6);
  ctx.beginPath();
  ctx.arc(-2.6, -2, 1.5, 0, TAU);
  ctx.arc(2.6, -2, 1.5, 0, TAU);
  ctx.fill();

  ctx.restore();

  if (e.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = e.hitFlash * 3.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y - 14, e.w * 0.7, e.h, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawBoss(ctx, e, t) {
  const windSlam = e.state === 'slamWind';
  const slam = e.state === 'slam';
  const charge = e.state === 'charge';
  const windCharge = e.state === 'chargeWind';
  const bob = Math.sin(e.animT * 2.4) * 1.6;

  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(e.facing, 1);

  const hipY = -64 + bob;

  // 腿
  ctx.strokeStyle = '#2a3138';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-20, hipY);
  ctx.lineTo(-32, -34);
  ctx.lineTo(-34, -6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, hipY);
  ctx.lineTo(32, -34);
  ctx.lineTo(34, -6);
  ctx.stroke();
  ctx.fillStyle = '#151a1e';
  ctx.fillRect(-46, -10, 30, 10);
  ctx.fillRect(16, -10, 30, 10);

  // 躯干
  ctx.beginPath();
  ctx.moveTo(-46, hipY + 8);
  ctx.quadraticCurveTo(-62, -108, -34, -132);
  ctx.quadraticCurveTo(0, -148, 36, -130);
  ctx.quadraticCurveTo(62, -104, 46, hipY + 10);
  ctx.quadraticCurveTo(0, hipY + 22, -46, hipY + 8);
  ctx.closePath();
  const bg = ctx.createLinearGradient(-50, -140, 50, hipY);
  bg.addColorStop(0, '#4a5057');
  bg.addColorStop(0.45, '#2c3339');
  bg.addColorStop(1, '#12171b');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#070a0c';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // 胸口锁链
  ctx.strokeStyle = 'rgba(150,150,140,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-24, -116);
  ctx.quadraticCurveTo(0, -96, 26, -114);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20,24,26,0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 腰带
  ctx.fillStyle = '#1c2024';
  ctx.fillRect(-44, hipY - 4, 88, 16);
  ctx.fillStyle = '#8a7444';
  fillRoundRect(ctx, -13, hipY - 8, 26, 24, 3, '#8a7444');
  ctx.strokeStyle = '#3a2f1a';
  ctx.lineWidth = 2;
  roundRectPath(ctx, -13, hipY - 8, 26, 24, 3);
  ctx.stroke();

  // 肩甲
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(s * 42, -118);
    ctx.rotate(s * -0.18);
    ctx.beginPath();
    ctx.moveTo(-20 * s, 12);
    ctx.quadraticCurveTo(-26 * s, -16, 0, -22);
    ctx.quadraticCurveTo(26 * s, -16, 22 * s, 14);
    ctx.quadraticCurveTo(0, 24, -20 * s, 12);
    ctx.closePath();
    const ag = ctx.createLinearGradient(-20, -20, 20, 16);
    ag.addColorStop(0, '#7a838b');
    ag.addColorStop(0.5, '#454e55');
    ag.addColorStop(1, '#1b2126');
    ctx.fillStyle = ag;
    ctx.fill();
    ctx.strokeStyle = '#080c0e';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 尖刺
    ctx.fillStyle = '#9aa4a9';
    ctx.beginPath();
    ctx.moveTo(-4 * s, -20);
    ctx.lineTo(2 * s, -34);
    ctx.lineTo(8 * s, -18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 头部
  ctx.save();
  ctx.translate(8, -148);
  // 头盔
  ctx.beginPath();
  ctx.moveTo(-18, 16);
  ctx.quadraticCurveTo(-24, -10, -6, -22);
  ctx.quadraticCurveTo(14, -26, 23, -8);
  ctx.quadraticCurveTo(26, 12, 14, 18);
  ctx.quadraticCurveTo(-4, 22, -18, 16);
  ctx.closePath();
  const hg = ctx.createLinearGradient(-20, -22, 22, 18);
  hg.addColorStop(0, '#5d666d');
  hg.addColorStop(0.5, '#333b41');
  hg.addColorStop(1, '#13181c');
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = '#060a0c';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  // 犄角
  ctx.fillStyle = '#b7bfc0';
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.quadraticCurveTo(-30, -34, -16, -44);
  ctx.quadraticCurveTo(-12, -28, -6, -20);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4a5153';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(16, -16);
  ctx.quadraticCurveTo(30, -30, 18, -40);
  ctx.quadraticCurveTo(14, -26, 8, -19);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 眼睛
  ctx.fillStyle = 'rgba(255,92,70,0.98)';
  pxShadow(ctx, 'rgba(255,60,40,1)', windSlam ? 16 : 10);
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(2, 2);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.lineTo(20, 3);
  ctx.lineTo(13, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 斧头手臂
  let axeAngle = 0.9;
  let handX = 36;
  let handY = -80;
  if (windSlam) {
    axeAngle = -1.9;
    handX = 22;
    handY = -138;
  } else if (slam) {
    axeAngle = 0.35;
    handX = 46;
    handY = -92;
  } else if (charge) {
    axeAngle = 1.25;
    handX = 30;
    handY = -70;
  } else if (windCharge) {
    axeAngle = 1.05;
    handX = 38;
    handY = -76;
  }

  ctx.strokeStyle = '#3a4248';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(34, -110);
  ctx.lineTo(handX + 14, handY + 10);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // 斧柄
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(axeAngle);
  ctx.fillStyle = '#3b2c1e';
  ctx.fillRect(-4, -12, 8, 92);
  ctx.strokeStyle = '#120d08';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-4, -12, 8, 92);
  // 斧刃
  ctx.beginPath();
  ctx.moveTo(2, 52);
  ctx.quadraticCurveTo(40, 46, 46, 70);
  ctx.quadraticCurveTo(30, 86, 2, 82);
  ctx.closePath();
  const ag2 = ctx.createLinearGradient(0, 46, 46, 84);
  ag2.addColorStop(0, '#c3ced2');
  ag2.addColorStop(0.5, '#79878d');
  ag2.addColorStop(1, '#323b40');
  ctx.fillStyle = ag2;
  ctx.fill();
  ctx.strokeStyle = '#0c1113';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 58);
  ctx.quadraticCurveTo(34, 56, 38, 68);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // 另一只手臂（空拳）
  ctx.strokeStyle = '#333b41';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-34, -108);
  ctx.lineTo(-52, -78);
  ctx.lineTo(-48, -58);
  ctx.stroke();

  /* 甲胄缝隙里透出的熔火 */
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const crackA = 0.25 + Math.sin(t * 2.6) * 0.12;
  ctx.strokeStyle = `rgba(255,110,60,${crackA})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, -104);
  ctx.lineTo(2, -84);
  ctx.lineTo(-4, -66);
  ctx.moveTo(2, -84);
  ctx.lineTo(14, -76);
  ctx.stroke();
  /* 轮廓光 */
  ctx.strokeStyle = 'rgba(180,215,225,0.26)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-42, hipY + 6);
  ctx.quadraticCurveTo(-60, -106, -32, -130);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  if (e.hitFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.7, e.hitFlash * 4);
    fillRoundRect(ctx, e.x - e.w / 2, e.y - e.h, e.w, e.h, 16, '#fff');
    ctx.restore();
  }
}

/* 各敌人的精灵包围盒(世界坐标):用于低分辨率精灵层的裁切范围 */
function pxEnemyBounds(e) {
  if (e.type === 'boss') return { x: e.x - 104, y: e.y - 208, w: 208, h: 222 };
  if (e.type === 'bat') return { x: e.x - 56, y: e.y - 58, w: 112, h: 74 };
  return { x: e.x - 58, y: e.y - e.h - 54, w: 116, h: e.h + 62 };
}

function drawEnemy(ctx, e, game) {
  if (e.dead) return;
  const t = game.time;
  if (e.type === 'bat') {
    drawEnemyShadow(ctx, e, 0.16, 0.6);
  } else if (e.type === 'boss') {
    drawEnemyShadow(ctx, e, 0.4, 1.2);
  } else {
    drawEnemyShadow(ctx, e, 0.3, 1);
  }

  /* 与主角同一套建模类型:低分辨率光栅化 + 最近邻放大 = 像素精灵 */
  pxSprite(ctx, pxEnemyBounds(e), (c) => {
    switch (e.type) {
      case 'husk': drawHusk(c, e, t); break;
      case 'shield': drawShield(c, e, t); break;
      case 'grenadier': drawGrenadier(c, e, t); break;
      case 'bat': drawBat(c, e, t); break;
      case 'boss': drawBoss(c, e, t); break;
      default: break;
    }
  }, { outline: true });
  drawWindupMark(ctx, e, t);
  drawEnemyBar(ctx, e);
}
