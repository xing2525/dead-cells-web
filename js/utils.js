'use strict';

/* =========================================================
   基础工具
   ========================================================= */
const TAU = Math.PI * 2;
const WORLD_H = 720;
const GROUND_Y = 600;
const GRAVITY = 2200;
const MAX_FALL = 1250;

const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const signOf = (v) => (v < 0 ? -1 : (v > 0 ? 1 : 0));
const approach = (v, target, delta) => {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return target;
};

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t) => t * t * t;
const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/* 确定性随机（关卡生成用） */
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* =========================================================
   几何 / 碰撞
   ========================================================= */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function entityRect(e) {
  return { x: e.x - e.w / 2, y: e.y - e.h, w: e.w, h: e.h };
}

function circleRect(cx, cy, cr, r) {
  const nx = clamp(cx, r.x, r.x + r.w);
  const ny = clamp(cy, r.y, r.y + r.h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy <= cr * cr;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill) {
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/* 实体与关卡碰撞（先 X 后 Y），y 为脚底 */
function moveAndCollide(e, dt, level) {
  e.x += e.vx * dt;
  let box = entityRect(e);
  for (const p of level.platforms) {
    if (p.oneWay) continue;
    if (!rectsOverlap(box, p)) continue;
    if (e.vx > 0) e.x = p.x - e.w / 2;
    else if (e.vx < 0) e.x = p.x + p.w + e.w / 2;
    else {
      const pushLeft = box.x + box.w - p.x;
      const pushRight = p.x + p.w - box.x;
      e.x += pushLeft < pushRight ? -pushLeft : pushRight;
    }
    e.vx = 0;
    box = entityRect(e);
  }

  const prevBottom = e.y;
  e.y += e.vy * dt;
  e.onGround = false;
  e.groundPlatform = null;
  box = entityRect(e);
  for (const p of level.platforms) {
    if (!rectsOverlap(box, p)) continue;
    if (p.oneWay) {
      if (e.vy >= 0 && prevBottom <= p.y + 2.5) {
        e.y = p.y;
        e.vy = 0;
        e.onGround = true;
        e.groundPlatform = p;
        box = entityRect(e);
      }
    } else if (e.vy >= 0 && prevBottom <= p.y + 2.5) {
      e.y = p.y;
      e.vy = 0;
      e.onGround = true;
      e.groundPlatform = p;
      box = entityRect(e);
    } else if (e.vy < 0) {
      e.y = p.y + p.h;
      e.vy = 0;
      box = entityRect(e);
    } else {
      e.y = p.y;
      e.vy = 0;
      e.onGround = true;
      e.groundPlatform = p;
      box = entityRect(e);
    }
  }
}

function levelSolidAt(level, x, y) {
  for (const p of level.platforms) {
    if (p.oneWay) continue;
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return true;
  }
  return false;
}

/* 脚下是否有地（防止AI走进深渊） */
function hasGroundAhead(e, level) {
  const probeX = e.x + e.facing * (e.w / 2 + 14);
  return levelSolidAt(level, probeX, e.y + 10);
}

/* =========================================================
   存储
   ========================================================= */
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) { /* 忽略隐私模式下的写入失败 */ }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (err) { /* 忽略隐私模式下的删除失败 */ }
  }
};

/* 画布文字辅助 */
function setFont(ctx, size, weight, family) {
  ctx.font = `${weight || 400} ${size}px ${family || '"Noto Sans SC","Microsoft YaHei",sans-serif'}`;
}
