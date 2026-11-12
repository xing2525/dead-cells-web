'use strict';

/* =========================================================
   HUD 与界面文字
   ========================================================= */
function drawAbilityIcon(ctx, type, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  if (type === 'knife') {
    ctx.rotate(-0.5);
    ctx.fillStyle = '#dfeff2';
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.16);
    ctx.lineTo(s * 0.5, 0);
    ctx.lineTo(-s * 0.5, s * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a9863f';
    ctx.fillRect(-s * 0.66, -s * 0.1, s * 0.18, s * 0.2);
  } else if (type === 'grenade') {
    ctx.fillStyle = '#5c6a56';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.34, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#95f0a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.34, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#b9c48a';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.24);
    ctx.quadraticCurveTo(s * 0.2, -s * 0.5, s * 0.34, -s * 0.4);
    ctx.stroke();
    ctx.fillStyle = '#ffb066';
    ctx.beginPath();
    ctx.arc(s * 0.34, -s * 0.4, 1.8, 0, TAU);
    ctx.fill();
  } else if (type === 'potion') {
    ctx.fillStyle = '#7cf0c8';
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, -s * 0.42);
    ctx.lineTo(s * 0.16, -s * 0.42);
    ctx.lineTo(s * 0.16, -s * 0.2);
    ctx.quadraticCurveTo(s * 0.4, s * 0.08, s * 0.26, s * 0.36);
    ctx.quadraticCurveTo(0, s * 0.54, -s * 0.26, s * 0.36);
    ctx.quadraticCurveTo(-s * 0.4, s * 0.08, -s * 0.16, -s * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b7e0cc';
    ctx.fillRect(-s * 0.1, -s * 0.52, s * 0.2, s * 0.1);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-s * 0.1, s * 0.16, s * 0.05, s * 0.12, -0.4, 0, TAU);
    ctx.fill();
  } else if (type === 'frostnova') { // 六角雪花
    ctx.strokeStyle = '#9fe8ff';
    ctx.lineWidth = Math.max(1.4, s * 0.07);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * s * 0.44, Math.sin(a) * s * 0.44);
      ctx.moveTo(Math.cos(a) * s * 0.26, Math.sin(a) * s * 0.26);
      ctx.lineTo(Math.cos(a + 0.5) * s * 0.4, Math.sin(a + 0.5) * s * 0.4);
      ctx.stroke();
    }
  } else if (type === 'turret') { // 弩塔
    ctx.fillStyle = '#8b9aa0';
    ctx.fillRect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.44);
    ctx.fillStyle = '#b9c9cc';
    ctx.fillRect(-s * 0.12, -s * 0.42, s * 0.24, s * 0.3);
    ctx.fillStyle = '#ffd9a0';
    ctx.fillRect(-s * 0.06, -s * 0.52, s * 0.12, s * 0.1);
  } else if (type === 'smoke') { // 烟雾
    ctx.fillStyle = 'rgba(170,195,200,0.85)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc((i - 1) * s * 0.2, Math.sin(i * 2) * s * 0.12, s * 0.18, 0, TAU);
      ctx.fill();
    }
  } else if (type === 'thunder') { // 闪电
    ctx.fillStyle = '#d8f0ff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.5);
    ctx.lineTo(s * 0.22, -s * 0.08);
    ctx.lineTo(s * 0.02, -s * 0.04);
    ctx.lineTo(s * 0.16, s * 0.5);
    ctx.lineTo(-s * 0.22, 0);
    ctx.lineTo(-s * 0.02, -s * 0.06);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'heal') { // 十字
    ctx.fillStyle = '#7cf0c8';
    ctx.fillRect(-s * 0.1, -s * 0.42, s * 0.2, s * 0.84);
    ctx.fillRect(-s * 0.42, -s * 0.1, s * 0.84, s * 0.2);
  } else if (type === 'hook') { // 钩爪
    ctx.strokeStyle = '#e6c88c';
    ctx.lineWidth = Math.max(1.4, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, -s * 0.34);
    ctx.lineTo(s * 0.12, s * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.16, s * 0.18, s * 0.22, -0.4, Math.PI * 1.1);
    ctx.stroke();
  } else if (type === 'shield') { // 盾牌
    ctx.fillStyle = '#b9c9cc';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.46);
    ctx.lineTo(s * 0.36, -s * 0.24);
    ctx.lineTo(s * 0.28, s * 0.24);
    ctx.lineTo(0, s * 0.5);
    ctx.lineTo(-s * 0.28, s * 0.24);
    ctx.lineTo(-s * 0.36, -s * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7d9296';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  } else if (type === 'weapon') { // 剑
    ctx.rotate(-0.7);
    ctx.fillStyle = '#e2eef0';
    ctx.beginPath();
    ctx.moveTo(-s * 0.07, s * 0.1);
    ctx.lineTo(s * 0.07, s * 0.1);
    ctx.lineTo(s * 0.05, -s * 0.48);
    ctx.lineTo(0, -s * 0.56);
    ctx.lineTo(-s * 0.05, -s * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#a9863f';
    ctx.fillRect(-s * 0.22, s * 0.08, s * 0.44, s * 0.08);
    ctx.fillStyle = '#5b4a2e';
    ctx.fillRect(-s * 0.05, s * 0.16, s * 0.1, s * 0.24);
  } else if (type === 'bow') { // 弓
    ctx.strokeStyle = '#cfa96b';
    ctx.lineWidth = Math.max(1.4, s * 0.07);
    ctx.beginPath();
    ctx.arc(-s * 0.12, 0, s * 0.42, -1.1, 1.1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,240,240,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 0.38);
    ctx.lineTo(s * 0.06, s * 0.38);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAbilitySlot(game, x, y, s, key, icon, opts) {
  const { ctx } = game;
  const ready = !opts.cooldown || opts.cooldown <= 0;
  ctx.save();

  roundRectPath(ctx, x, y, s, s, 4);
  ctx.fillStyle = 'rgba(5,12,15,0.78)';
  ctx.fill();
  ctx.strokeStyle = ready ? 'rgba(125,200,205,0.38)' : 'rgba(90,120,125,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 顶部高光
  ctx.fillStyle = 'rgba(140,220,225,0.08)';
  ctx.fillRect(x + 1, y + 1, s - 2, 1);

  ctx.globalAlpha = ready ? 1 : 0.4;
  drawAbilityIcon(ctx, icon, x + s / 2, y + s / 2 - 3, s * 0.62);
  ctx.globalAlpha = 1;

  // 冷却遮罩
  if (opts.cooldown > 0) {
    const ratio = clamp(opts.cooldown / opts.maxCooldown, 0, 1);
    ctx.fillStyle = 'rgba(3,7,9,0.68)';
    ctx.fillRect(x + 1, y + 1, s - 2, (s - 2) * ratio);
    ctx.fillStyle = 'rgba(220,240,240,0.85)';
    ctx.font = '600 11px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.cooldown.toFixed(1), x + s / 2, y + s / 2 + 4);
  }

  // 数量
  if (opts.count !== undefined) {
    ctx.fillStyle = opts.count > 0 ? '#d9f5f0' : '#7d8f92';
    ctx.font = '600 10.5px "Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.count, x + s / 2, y + 11);
  }

  // 键位
  ctx.fillStyle = 'rgba(10,20,24,0.92)';
  ctx.fillRect(x, y + s - 13, s, 13);
  ctx.strokeStyle = 'rgba(125,200,205,0.2)';
  ctx.beginPath();
  ctx.moveTo(x, y + s - 13);
  ctx.lineTo(x + s, y + s - 13);
  ctx.stroke();
  ctx.fillStyle = 'rgba(180,215,218,0.85)';
  ctx.font = '600 9.5px "Segoe UI",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(key, x + s / 2, y + s - 3);

  // 少量弹药点
  if (opts.dots !== undefined) {
    for (let i = 0; i < opts.dotsMax; i++) {
      ctx.fillStyle = i < opts.dots ? '#8ff3ee' : 'rgba(110,140,145,0.3)';
      ctx.fillRect(x + 6 + i * 5, y + s - 20, 3, 3);
    }
  }
  ctx.restore();
}

function drawBossBar(game) {
  const boss = game.enemies.find((e) => e.type === 'boss' && !e.dead);
  if (!boss) return;
  const { ctx, cssW, cssH } = game;
  const u = clamp(cssH / 760, 0.8, 1.5);
  const w = Math.min(cssW * 0.44, 560 * u);
  const x = (cssW - w) / 2;
  const y = 34 * u;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `700 ${13 * u}px "Noto Serif SC","Songti SC",serif`;
  ctx.fillStyle = 'rgba(255,205,195,0.92)';
  ctx.fillText('狱 卒', cssW / 2, y - 9 * u);

  ctx.fillStyle = 'rgba(4,8,10,0.8)';
  fillRoundRect(ctx, x, y, w, 13 * u, 2, 'rgba(4,8,10,0.8)');
  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#8f1d27');
  g.addColorStop(0.5, '#e2545a');
  g.addColorStop(1, '#8f1d27');
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 1, (w - 2) * ratio, 13 * u - 2);
  ctx.strokeStyle = 'rgba(220,120,110,0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, 13 * u);

  for (let i = 1; i < 5; i++) {
    ctx.strokeStyle = 'rgba(5,8,10,0.5)';
    ctx.beginPath();
    ctx.moveTo(x + (w / 5) * i, y + 1);
    ctx.lineTo(x + (w / 5) * i, y + 13 * u - 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHUD(game) {
  const { ctx, cssW, cssH, player } = game;
  if (!player) return;
  const u = clamp(cssH / 760, 0.8, 1.5);
  const margin = 32 * u;

  ctx.save();
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);

  /* 生命 */
  const barX = margin;
  const barY = 46 * u;
  const barW = 292 * u;
  const barH = 15 * u;

  ctx.textAlign = 'left';
  ctx.font = `600 ${10.5 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle = 'rgba(150,185,190,0.7)';
  ctx.fillText('生 命', barX, barY - 10 * u);

  ctx.textAlign = 'right';
  ctx.font = `600 ${11 * u}px "Segoe UI",sans-serif`;
  ctx.fillStyle = 'rgba(215,238,236,0.85)';
  ctx.fillText(`${Math.ceil(Math.max(0, player.hp))} / ${player.hpMax}`, barX + barW, barY - 10 * u);

  fillRoundRect(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 3, 'rgba(3,8,10,0.78)');
  ctx.strokeStyle = 'rgba(125,190,195,0.28)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 3);
  ctx.stroke();

  const hpRatio = clamp(player.hp / player.hpMax, 0, 1);
  if (hpRatio > 0) {
    const hg = ctx.createLinearGradient(barX, barY, barX, barY + barH);
    hg.addColorStop(0, '#ff7d78');
    hg.addColorStop(0.45, '#e2545a');
    hg.addColorStop(1, '#8d1f28');
    ctx.fillStyle = hg;
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW * hpRatio, 2);
  }
  // 分段刻度
  for (let i = 1; i < 5; i++) {
    ctx.strokeStyle = 'rgba(4,8,10,0.5)';
    ctx.beginPath();
    ctx.moveTo(barX + (barW / 5) * i, barY);
    ctx.lineTo(barX + (barW / 5) * i, barY + barH);
    ctx.stroke();
  }

  /* 货币 */
  let cy = barY + 38 * u;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f7c65c';
  ctx.beginPath();
  ctx.arc(barX + 5 * u, cy - 4 * u, 5 * u, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(barX + 3.4 * u, cy - 5.6 * u, 1.4 * u, 0, TAU);
  ctx.fill();
  ctx.font = `600 ${13 * u}px "Segoe UI",sans-serif`;
  ctx.fillStyle = 'rgba(235,242,238,0.9)';
  ctx.fillText(`${game.run.gold}`, barX + 17 * u, cy);

  ctx.save();
  ctx.translate(barX + 96 * u, cy - 4 * u);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#7df3ec';
  ctx.shadowColor = 'rgba(110,245,240,0.8)';
  ctx.shadowBlur = 7;
  ctx.fillRect(-4 * u, -4 * u, 8 * u, 8 * u);
  ctx.restore();
  ctx.fillStyle = 'rgba(235,242,238,0.9)';
  ctx.font = `600 ${13 * u}px "Segoe UI",sans-serif`;
  ctx.fillText(`${game.run.cells}`, barX + 108 * u, cy);

  /* 三色属性 + 变异 */
  let sx = barX;
  const statY = cy + 20 * u;
  for (const id of ['brutality', 'tactics', 'survival']) {
    const st = STATS[id];
    const lv = (player.scrolls && player.scrolls[id]) || 0;
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(sx + 4 * u, statY - 4 * u, 3.6 * u, 0, TAU);
    ctx.fill();
    ctx.font = `700 ${11 * u}px "Segoe UI",sans-serif`;
    ctx.fillStyle = lv > 0 ? 'rgba(238,246,244,0.95)' : 'rgba(150,175,178,0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(String(lv), sx + 11 * u, statY);
    sx += 34 * u;
  }
  if (player.mutations && player.mutations.length) {
    ctx.font = `500 ${11 * u}px "Segoe UI","Noto Sans SC",sans-serif`;
    ctx.fillStyle = 'rgba(199,155,255,0.9)';
    const names = player.mutations.map((id) => (MUTATION_MAP[id] ? MUTATION_MAP[id].name : id));
    ctx.fillText(names.join(' · '), barX + 118 * u, statY);
  }

  /* 区域信息 */
  const theme = game.level.theme;
  ctx.textAlign = 'right';
  ctx.font = `700 ${17 * u}px "Noto Serif SC","Songti SC",serif`;
  ctx.fillStyle = 'rgba(224,243,241,0.9)';
  ctx.fillText(theme.name, cssW - margin, 45 * u);
  ctx.font = `500 ${10.5 * u}px "Segoe UI","Noto Sans SC",sans-serif`;
  ctx.fillStyle = 'rgba(145,180,184,0.7)';
  ctx.fillText(`深度 ${game.stage}  ·  ${theme.en}`, cssW - margin, 62 * u);

  const alive = game.enemies.filter((e) => !e.dead).length;
  ctx.fillStyle = 'rgba(145,180,184,0.5)';
  ctx.fillText(`威胁 ${alive}`, cssW - margin, 78 * u);

  /* 装备槽:武器 / 盾 / 技能1 / 技能2 / 药水 */
  const touch = !!game.isTouch;
  const slot = 52 * u;
  const gap = 10 * u;
  const slotY = cssH - (touch ? 22 : 34) * u - slot;
  /* 触屏时摇杆占左侧，装备槽改为底部居中，避免互相遮挡 */
  let slotX = touch
    ? Math.max(margin, (cssW - (slot * 5 + gap * 4)) / 2)
    : margin;

  /* 主手武器(Q 切换) */
  const weapon = player.weaponItem();
  const wdef = player.weaponDef();
  const isRanged = wdef.kind === 'ranged';
  const ammo = isRanged && weapon ? (weapon.ammo === undefined ? wdef.ammo : weapon.ammo) : undefined;
  drawAbilitySlot(game, slotX, slotY, slot, 'Q', isRanged ? 'bow' : 'weapon', {
    cooldown: 0,
    count: isRanged ? ammo : undefined
  });
  slotX += slot + gap;

  /* 盾牌(L 举盾) */
  const shieldItem = player.gear.shield;
  const sdef = shieldItem ? SHIELD_MAP[shieldItem.defId] : null;
  drawAbilitySlot(game, slotX, slotY, slot, 'L', sdef ? 'shield' : null, {
    cooldown: 0
  });
  slotX += slot + gap;

  /* 技能 1(U) / 技能 2(I) */
  const skillKeys = [['skill1', 'U'], ['skill2', 'I']];
  for (const [slotName, key] of skillKeys) {
    const item = player.gear[slotName];
    const def = item ? SKILL_MAP[item.defId] : null;
    const st = player.skillState && player.skillState[slotName];
    drawAbilitySlot(game, slotX, slotY, slot, key, def ? def.id : null, {
      cooldown: st ? st.cd : 0,
      maxCooldown: def ? def.cd : 1,
      count: def && def.charges > 1 && st ? st.ammo : undefined
    });
    slotX += slot + gap;
  }

  /* 药水(F):数量有限,用尽后槽位变暗 */
  drawAbilitySlot(game, slotX, slotY, slot, 'F', 'potion', {
    cooldown: player.potionCd,
    maxCooldown: 0.7,
    count: player.potions
  });
  if (player.potions <= 0) {
    fillRoundRect(ctx, slotX + 1, slotY + 1, slot - 2, slot - 2, 4, 'rgba(4,8,10,0.68)');
  }
  /* 醒目数量角标 */
  ctx.textAlign = 'right';
  ctx.font = `700 ${12 * u}px "Segoe UI",sans-serif`;
  ctx.fillStyle = player.potions > 0 ? 'rgba(150,240,210,0.95)' : 'rgba(220,110,110,0.95)';
  ctx.fillText('×' + player.potions, slotX + slot - 4 * u, slotY - 5 * u);

  /* 操作提示（触屏已有虚拟按键，不显示键盘提示） */
  if (!touch) {
    ctx.textAlign = 'right';
    ctx.font = `500 ${10.5 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = 'rgba(140,172,176,0.5)';
    ctx.fillText('J 攻击   K 翻滚   Q 换武器   L 举盾   U/I 技能   E 拾取   ESC 暂停', cssW - margin, cssH - 34 * u);
  }
  if (game.muted) {
    ctx.fillStyle = 'rgba(226,84,90,0.75)';
    ctx.fillText('静音中', cssW - margin, cssH - 50 * u);
  }

  drawInfectionBar(game);
  drawBossBar(game);
  ctx.restore();
}

/* 疫病感染条(顶部中央):青 → 黄 → 绿 */
function drawInfectionBar(game) {
  const { ctx, cssW } = game;
  const u = clamp(game.cssH / 760, 0.8, 1.5);
  const cfg = TIDE_CFG;
  const ratio = clamp(game.infection / cfg.threshold, 0, 1);
  const w = 250 * u;
  const h = 7 * u;
  const x = cssW / 2 - w / 2;
  const y = 26 * u;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = `600 ${9.5 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle = game.tideActive ? 'rgba(184,255,156,0.95)' : 'rgba(150,185,190,0.6)';
  ctx.fillText(game.tideActive ? `疫病潮汐  ${game.tideT.toFixed(1)}s` : '疫病感染', cssW / 2, y - 7 * u);

  fillRoundRect(ctx, x - 1, y - 1, w + 2, h + 2, 3, 'rgba(3,8,10,0.75)');
  const col = ratio < 0.5 ? '#6fe8ea' : (ratio < 0.85 ? '#e8d46f' : '#8ae37f');
  const pulse = game.tideActive ? 0.7 + Math.sin(game.time * 8) * 0.3 : 1;
  ctx.globalAlpha = pulse;
  if (ratio > 0) fillRoundRect(ctx, x, y, w * ratio, h, 2, col);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = game.tideActive ? 'rgba(160,255,150,0.7)' : 'rgba(125,200,205,0.25)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, 2);
  ctx.stroke();
  ctx.restore();
}

function drawInteractPrompt(game) {
  if (game.state !== 'playing' || game.transition || game.choice) return;
  const { ctx, cssW, cssH, player } = game;
  const u = clamp(cssH / 760, 0.8, 1.5);
  const bossAlive = game.enemies.some((e) => e.type === 'boss' && !e.dead);

  /* 交互目标优先级:收集者 > 商人 > 大门 */
  const lv = game.level;
  let text = null;
  let accent = 'rgba(125,220,220,0.45)';
  let border = 'rgba(125,220,220,0.45)';
  if (lv.collector && Math.abs(player.x - lv.collector.x) < 90) {
    text = `存入细胞（当前 ${game.run.cells}）`;
    accent = 'rgba(125,243,236,0.9)';
    border = 'rgba(125,243,236,0.55)';
  } else if (game.echoChest && !game.echoChest.collected && Math.abs(player.x - game.echoChest.x) < 110) {
    text = '取回回响残片';
    accent = 'rgba(199,155,255,0.95)';
    border = 'rgba(199,155,255,0.55)';
  } else if (lv.merchant && Math.abs(player.x - lv.merchant.x) < 90) {
    text = `流浪商人（金币 ${game.run.gold}）`;
    accent = 'rgba(255,190,110,0.9)';
    border = 'rgba(255,190,110,0.5)';
  } else if (game.nearDoor) {
    text = bossAlive ? '大门被封印 · 击败狱卒' : '进入下一区域';
    if (bossAlive) {
      accent = 'rgba(235,160,155,0.9)';
      border = 'rgba(180,80,80,0.5)';
    }
  }
  if (!text) return;

  const showKey = text !== '大门被封印 · 击败狱卒';
  const y = cssH - 142 * u;

  ctx.save();
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  ctx.textAlign = 'center';
  ctx.font = `500 ${12 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  const padX = 20 * u;
  const w = ctx.measureText(text).width + padX * 2 + (showKey ? 28 * u : 0);
  const x = cssW / 2 - w / 2;

  roundRectPath(ctx, x, y, w, 34 * u, 4);
  ctx.fillStyle = 'rgba(4,10,13,0.82)';
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (showKey) {
    fillRoundRect(ctx, x + 10 * u, y + 7 * u, 20 * u, 20 * u, 3, 'rgba(120,235,235,0.14)');
    ctx.strokeStyle = 'rgba(140,245,240,0.6)';
    roundRectPath(ctx, x + 10 * u, y + 7 * u, 20 * u, 20 * u, 3);
    ctx.stroke();
    ctx.fillStyle = '#bff5f1';
    ctx.font = `600 ${11 * u}px "Segoe UI",sans-serif`;
    ctx.fillText('E', x + 20 * u, y + 21 * u);
  }

  ctx.fillStyle = accent;
  ctx.font = `500 ${12 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(text, x + (showKey ? 38 * u : padX), y + 22 * u);
  ctx.restore();
}

function drawToast(game) {
  if (!game.toast || game.toast.t <= 0) return;
  const { ctx, cssW, cssH } = game;
  const u = clamp(cssH / 760, 0.8, 1.5);
  const a = clamp(game.toast.t / 0.3, 0, 1) * clamp((2.2 - game.toast.t) / 0.3, 0, 1);
  ctx.save();
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.font = `600 ${14 * u}px "Noto Serif SC","Songti SC",serif`;
  ctx.fillStyle = 'rgba(255,210,190,0.95)';
  ctx.fillText(game.toast.text, cssW / 2, 118 * u);
  ctx.strokeStyle = 'rgba(220,120,100,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cssW / 2 - 60 * u, 127 * u);
  ctx.lineTo(cssW / 2 + 60 * u, 127 * u);
  ctx.stroke();
  ctx.restore();
}

function drawIntro(game) {
  if (!game.intro || game.intro.t > 3.4) return;
  const { ctx, cssW, cssH } = game;
  const t = game.intro.t;
  const a = clamp(t / 0.5, 0, 1) * clamp((3.4 - t) / 0.7, 0, 1);
  const u = clamp(cssH / 760, 0.8, 1.5);
  const rise = (1 - clamp(t / 1.2, 0, 1)) * 16;

  ctx.save();
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';

  ctx.strokeStyle = 'rgba(125,220,220,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cssW / 2 - 190 * u, cssH * 0.34 + rise);
  ctx.lineTo(cssW / 2 - 96 * u, cssH * 0.34 + rise);
  ctx.moveTo(cssW / 2 + 96 * u, cssH * 0.34 + rise);
  ctx.lineTo(cssW / 2 + 190 * u, cssH * 0.34 + rise);
  ctx.stroke();

  ctx.font = `800 ${40 * u}px "Noto Serif SC","Songti SC",serif`;
  ctx.fillStyle = 'rgba(230,248,246,0.96)';
  ctx.shadowColor = 'rgba(90,220,225,0.35)';
  ctx.shadowBlur = 26;
  ctx.fillText(game.intro.title, cssW / 2, cssH * 0.34 + rise + 34 * u);

  ctx.shadowBlur = 0;
  ctx.font = `500 ${11.5 * u}px "Segoe UI","Noto Sans SC",sans-serif`;
  ctx.fillStyle = 'rgba(150,190,192,0.75)';
  ctx.fillText(`深度 ${game.stage}  ·  ${game.level.theme.en}`, cssW / 2, cssH * 0.34 + 58 * u + rise);
  ctx.restore();
}

/* 三选一面板(属性卷轴 / 变异) */
function drawChoicePanel(game) {
  const c = game.choice;
  if (!c) return;
  const { ctx, cssW, cssH } = game;
  const u = clamp(cssH / 760, 0.8, 1.5);
  const grow = clamp(c.t / 0.28, 0, 1);

  ctx.save();
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  ctx.fillStyle = `rgba(2,5,7,${0.72 * grow})`;
  ctx.fillRect(0, 0, cssW, cssH);

  ctx.globalAlpha = grow;
  ctx.textAlign = 'center';
  ctx.font = `800 ${34 * u}px "Noto Serif SC","Songti SC",serif`;
  ctx.fillStyle = 'rgba(232,248,246,0.96)';
  ctx.shadowColor = 'rgba(120,220,235,0.4)';
  ctx.shadowBlur = 22;
  ctx.fillText(c.title, cssW / 2, cssH * 0.28);
  ctx.shadowBlur = 0;
  ctx.font = `500 ${11.5 * u}px "Segoe UI","Noto Sans SC",sans-serif`;
  ctx.fillStyle = 'rgba(150,190,195,0.75)';
  ctx.fillText(c.subtitle || '', cssW / 2, cssH * 0.28 + 26 * u);

  const cardW = Math.min(240 * u, cssW * 0.27);
  const cardH = 148 * u;
  const gap = 22 * u;
  const totalW = c.options.length * cardW + (c.options.length - 1) * gap;
  const startX = (cssW - totalW) / 2;
  const y = cssH * 0.42;

  for (let i = 0; i < c.options.length; i++) {
    const o = c.options[i];
    const x = startX + i * (cardW + gap);
    const hover = Math.sin(game.time * 3 + i) * 1.5;
    ctx.save();
    ctx.translate(0, hover * (1 - grow));

    roundRectPath(ctx, x, y, cardW, cardH, 6);
    const g = ctx.createLinearGradient(x, y, x, y + cardH);
    g.addColorStop(0, 'rgba(18,30,36,0.96)');
    g.addColorStop(1, 'rgba(8,14,18,0.98)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = o.color || 'rgba(140,200,205,0.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // 顶部色条
    ctx.fillStyle = o.color || '#7fe0e4';
    ctx.globalAlpha = grow * 0.85;
    ctx.fillRect(x + 1, y + 1, cardW - 2, 2.4);
    ctx.globalAlpha = grow;

    ctx.textAlign = 'center';
    ctx.font = `700 ${17 * u}px "Noto Serif SC","Songti SC",serif`;
    ctx.fillStyle = o.color || '#dff2f0';
    ctx.fillText(o.name, x + cardW / 2, y + 36 * u);

    ctx.font = `500 ${11 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = 'rgba(176,205,206,0.85)';
    wrapText(ctx, o.desc || '', x + cardW / 2, y + 64 * u, cardW - 28 * u, 17 * u);

    // 键位提示
    ctx.fillStyle = 'rgba(10,20,24,0.9)';
    ctx.fillRect(x + cardW / 2 - 16 * u, y + cardH - 30 * u, 32 * u, 20 * u);
    ctx.strokeStyle = 'rgba(140,200,205,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + cardW / 2 - 16 * u, y + cardH - 30 * u, 32 * u, 20 * u);
    ctx.fillStyle = 'rgba(220,240,240,0.9)';
    ctx.font = `700 ${12 * u}px "Segoe UI",sans-serif`;
    ctx.fillText(String(i + 1), x + cardW / 2, y + cardH - 16 * u);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.font = `500 ${10.5 * u}px "Noto Sans SC","Microsoft YaHei",sans-serif`;
  ctx.fillStyle = 'rgba(140,175,180,0.6)';
  ctx.fillText('按 数字键 1 / 2 / 3 做出选择', cssW / 2, y + cardH + 34 * u);
  ctx.restore();
}

/* 画布内文本换行(中文按字符断行) */
function wrapText(ctx, text, cx, y, maxW, lineH) {
  const chars = String(text).split('');
  let line = '';
  let lines = 0;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, y + lines * lineH);
      lines++;
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, y + lines * lineH);
}

function drawTransition(game) {
  const tr = game.transition;
  if (!tr) return;
  const { ctx, cssW, cssH } = game;
  let alpha;
  if (tr.phase === 'out') alpha = clamp(tr.t / 0.45, 0, 1);
  else alpha = clamp(1 - tr.t / 0.8, 0, 1);
  ctx.save();
  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  ctx.fillStyle = `rgba(2,5,6,${alpha})`;
  ctx.fillRect(0, 0, cssW, cssH);
  if (tr.phase === 'in' && tr.title) {
    const a = clamp((tr.t - 0.12) / 0.3, 0, 1) * clamp((0.8 - tr.t) / 0.3, 0, 1);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    const u = clamp(cssH / 760, 0.8, 1.5);
    ctx.font = `800 ${38 * u}px "Noto Serif SC","Songti SC",serif`;
    ctx.fillStyle = 'rgba(230,250,248,0.96)';
    ctx.fillText(tr.title, cssW / 2, cssH * 0.5);
    ctx.font = `500 ${11.5 * u}px "Segoe UI","Noto Sans SC",sans-serif`;
    ctx.fillStyle = 'rgba(150,195,198,0.7)';
    ctx.fillText(tr.sub || '', cssW / 2, cssH * 0.5 + 26 * u);
  }
  ctx.restore();
}
