'use strict';

/* =========================================================
   像素精灵渲染管线（对标《重生细胞》的建模类型）

   《重生细胞》的角色不是矢量图形，而是把 3D 模型逐帧光栅化成
   低分辨率像素精灵，再以最近邻放大贴到场景里。这里用同样思路：
   角色先画进一张“低分辨率贴图缓冲区”，再整张放大贴回主画布，
   于是线条变成硬边像素、渐变被压成色阶，得到精灵质感。
   ========================================================= */

let PX_CELL = 1.8;             // 精灵像素的世界单位上限（仅在小窗口时生效，防止贴图过大）
const PX_MIN_CELL = 0.3;       // 精灵像素的世界单位下限
const PX_MAX_TEXELS = 1024;    // 单个精灵层最大边长，防止极端情况爆内存

/* 一键开关：改成 false 就退回原来的矢量直接绘制（方便对比手感） */
let PX_ENABLED = true;

/* 描边剪影阶段的开关：为 true 时，绘制代码应跳过灵火、光晕等加色层 */
let PX_SIL = false;

const pxLayerPool = new Map();

/* 取得（或复用）一块离屏画布作为精灵层 */
function pxLayer(w, h, ns) {
  const key = (ns || '') + w + 'x' + h;
  let c = pxLayerPool.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.pxCtx = c.getContext('2d');
    pxLayerPool.set(key, c);
  }
  return c;
}

/* 阴影模糊在这条管线里必须按“世界→贴图像素”的比例缩小。
   像素层的坐标变换是 1/cell，而 shadowBlur 不受变换影响，
   所以这里手动乘上比例系数。 */
function pxShadow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = Math.max(0, blur * (ctx.pxScale || 1));
}

/*
 * pxSprite(ctx, bounds, drawFn, opts)
 *   bounds : { x, y, w, h }  世界坐标下的精灵包围盒
 *   drawFn : (g) => {}       用世界坐标在 g 上绘制（内部可 translate 到角色原点）
 *   opts   : { cell, pad }
 *
 * 绘制结果会以最近邻放大贴回 ctx 当前变换，因此角色即刻变成像素精灵。
 */
function pxSprite(ctx, bounds, drawFn, opts) {
  const o = opts || {};
  /* 自适应精灵分辨率：让一个精灵像素尽量等于一个设备像素。
     这样角色在任意窗口尺寸 / 高分屏下都保持清晰，
     小窗口时再回退到 PX_CELL 的复古颗粒，避免贴图爆内存。 */
  const dpr = (typeof game !== 'undefined' && game && game.dpr) || 1;
  const zoom = (typeof game !== 'undefined' && game && game.scale) || 1;
  const fitCell = 1 / Math.max(0.5, dpr * zoom);
  const cell = o.cell || Math.min(PX_CELL, Math.max(PX_MIN_CELL, fitCell));
  const pad = o.pad == null ? 1 : o.pad;

  if (!PX_ENABLED || cell <= 0) {
    ctx.save();
    drawFn(ctx);
    ctx.restore();
    return;
  }

  let bw = Math.ceil(bounds.w / cell) + pad * 2;
  let bh = Math.ceil(bounds.h / cell) + pad * 2;
  bw = Math.max(2, Math.min(PX_MAX_TEXELS, bw));
  bh = Math.max(2, Math.min(PX_MAX_TEXELS, bh));

  const layer = pxLayer(bw, bh);
  const g = layer.pxCtx;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.shadowBlur = 0;
  g.shadowColor = 'rgba(0,0,0,0)';
  g.clearRect(0, 0, bw, bh);

  /* 世界坐标 → 贴图像素 */
  g.setTransform(1 / cell, 0, 0, 1 / cell, pad - bounds.x / cell, pad - bounds.y / cell);
  g.pxScale = 1 / cell;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  drawFn(g);
  g.pxScale = 1;

  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.shadowBlur = 0;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const dx = bounds.x - pad * cell;
  const dy = bounds.y - pad * cell;
  const dw = bw * cell;
  const dh = bh * cell;

  let dest = layer;

  /* 1 像素描边：单独再光栅化一遍“剪影”（跳过灵火/光晕等加色层，
     否则会把大范围辉光也描成实心黑块），压成纯黑后在贴图像素空间里
     朝 8 个方向各错开一个像素垫底，角色就有一圈硬边轮廓。
     所有偏移都在小贴图上完成，最后只做一次放大合成。 */
  if (o.outline) {
    const sil = pxLayer(bw, bh, 'sil');
    const s = sil.pxCtx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-over';
    s.shadowBlur = 0;
    s.clearRect(0, 0, bw, bh);
    s.setTransform(1 / cell, 0, 0, 1 / cell, pad - bounds.x / cell, pad - bounds.y / cell);
    s.pxScale = 1 / cell;
    s.lineJoin = 'round';
    s.lineCap = 'round';
    PX_SIL = true;
    try {
      drawFn(s);
    } finally {
      PX_SIL = false;
    }
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.pxScale = 1;
    s.globalAlpha = 1;
    s.shadowBlur = 0;
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = o.outline === true ? 'rgba(3,7,9,0.92)' : o.outline;
    s.fillRect(0, 0, bw, bh);
    s.globalCompositeOperation = 'source-over';

    const out = pxLayer(bw, bh, 'out');
    const og = out.pxCtx;
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.globalCompositeOperation = 'source-over';
    og.globalAlpha = 1;
    og.clearRect(0, 0, bw, bh);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        og.drawImage(sil, i, j);
      }
    }
    og.drawImage(layer, 0, 0);
    dest = out;
  }

  ctx.drawImage(dest, dx, dy, dw, dh);
  ctx.restore();
}

/* 供 HUD 等界面层复用同一套像素风（不经过世界变换） */
function pxSpriteScreen(ctx, x, y, w, h, drawFn, opts) {
  pxSprite(ctx, { x: x, y: y, w: w, h: h }, drawFn, opts);
}
