'use strict';

/* =========================================================
   手机触屏操作层
   - 左下虚拟摇杆：左右移动
   - 右下按钮：攻击 / 跳跃 / 翻滚 / 技能1 / 技能2 / 举盾 / 拾取
   仅在触屏设备上创建，桌面端完全无影响。
   ========================================================= */

const TOUCH_BUTTONS = [
  { code: 'KeyJ', label: '攻击', cls: 'attack' },
  { code: 'Space', label: '跳', cls: 'jump' },
  { code: 'KeyK', label: '翻滚', cls: 'roll' },
  { code: 'KeyU', label: '技1', cls: 'skill1' },
  { code: 'KeyI', label: '技2', cls: 'skill2' },
  { code: 'KeyL', label: '盾', cls: 'block', hold: true },
  { code: 'KeyE', label: '拾取', cls: 'pick' }
];

function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
}

/* 触摸操作直接写进游戏输入状态，复用键盘同一套缓冲字段 */
function touchPress(code) {
  if (!game || game.state !== 'playing' || !game.player || game.player.dead) return;
  if (game.transition || game.choice) return;
  game.keys[code] = true;
  const p = game.player;
  switch (code) {
    case 'Space': p.jumpBuffer = 0.13; break;
    case 'KeyJ': p.attackBuffer = 0.15; break;
    case 'KeyK': p.rollBuffer = 0.13; break;
    case 'KeyU': p.skill1Buffer = 0.13; break;
    case 'KeyI': p.skill2Buffer = 0.13; break;
    case 'KeyF': p.potionBuffer = 0.13; break;
    case 'KeyE':
      if (!game.tryPickup()) tryInteract();
      break;
    default: break;
  }
}

function touchRelease(code) {
  if (!game) return;
  game.keys[code] = false;
}

function setupTouchControls() {
  if (!isTouchDevice()) return;
  document.body.classList.add('is-touch');

  const root = document.createElement('div');
  root.className = 'touch-ui';

  /* ---------- 摇杆 ---------- */
  const stick = document.createElement('div');
  stick.className = 'touch-stick';
  const knob = document.createElement('div');
  knob.className = 'touch-knob';
  stick.appendChild(knob);
  root.appendChild(stick);

  let stickId = null;
  let originX = 0;
  const R = 52;

  function stickStart(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    stickId = t.identifier === undefined ? 'mouse' : t.identifier;
    originX = t.clientX;
    knob.style.transform = 'translate(0px, 0px)';
  }
  function stickMove(e) {
    if (stickId === null) return;
    const list = e.changedTouches || [e];
    for (const t of list) {
      const id = t.identifier === undefined ? 'mouse' : t.identifier;
      if (id !== stickId) continue;
      let dx = t.clientX - originX;
      dx = Math.max(-R, Math.min(R, dx));
      knob.style.transform = 'translate(' + dx + 'px, 0px)';
      const dead = 10;
      if (dx < -dead) {
        game.keys['KeyA'] = true;
        game.keys['KeyD'] = false;
      } else if (dx > dead) {
        game.keys['KeyD'] = true;
        game.keys['KeyA'] = false;
      } else {
        game.keys['KeyA'] = false;
        game.keys['KeyD'] = false;
      }
      e.preventDefault();
    }
  }
  function stickEnd() {
    stickId = null;
    knob.style.transform = 'translate(0px, 0px)';
    if (game) {
      game.keys['KeyA'] = false;
      game.keys['KeyD'] = false;
    }
  }

  stick.addEventListener('touchstart', (e) => { stickStart(e); e.preventDefault(); }, { passive: false });
  stick.addEventListener('touchmove', stickMove, { passive: false });
  stick.addEventListener('touchend', stickEnd);
  stick.addEventListener('touchcancel', stickEnd);

  /* ---------- 按钮 ---------- */
  const pad = document.createElement('div');
  pad.className = 'touch-pad';
  for (const b of TOUCH_BUTTONS) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'touch-btn ' + b.cls;
    el.textContent = b.label;
    el.addEventListener('touchstart', (e) => {
      touchPress(b.code);
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      if (b.hold) touchRelease(b.code);
      e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchcancel', () => {
      if (b.hold) touchRelease(b.code);
    });
    pad.appendChild(el);
  }
  root.appendChild(pad);
  document.body.appendChild(root);

  /* 触屏时也允许点按菜单按钮 */
  document.addEventListener('touchstart', () => {
    sfx.init();
    sfx.resume();
  }, { once: true });

  /* 首次触摸时尝试锁定横屏(部分浏览器需全屏,失败不影响游玩) */
  document.addEventListener('touchstart', () => {
    try {
      const so = screen.orientation;
      if (so && typeof so.lock === 'function') {
        const ret = so.lock('landscape');
        if (ret && typeof ret.catch === 'function') ret.catch(() => {});
      }
    } catch (err) { /* 不支持时忽略,靠竖屏提示引导 */ }
  }, { once: true });

  /* 竖屏提示上的「一键横屏」：先全屏再锁定方向 */
  const landBtn = document.getElementById('btn-landscape');
  if (landBtn) {
    landBtn.addEventListener('click', () => {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      const afterFullscreen = () => {
        try {
          const so = screen.orientation;
          if (so && typeof so.lock === 'function') {
            const ret = so.lock('landscape');
            if (ret && typeof ret.catch === 'function') ret.catch(() => {});
          }
        } catch (err) { /* 忽略 */ }
      };
      if (req) {
        try {
          const p = req.call(el);
          if (p && typeof p.then === 'function') p.then(afterFullscreen).catch(afterFullscreen);
          else afterFullscreen();
        } catch (err) {
          afterFullscreen();
        }
      } else {
        afterFullscreen();
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
    });
  }

  /* 旋转屏幕后重新计算画布尺寸 */
  window.addEventListener('orientationchange', () => {
    setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
  });
}
