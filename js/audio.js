'use strict';

/* =========================================================
   程序化音效（WebAudio，无外部资源）
   ========================================================= */
class AudioKit {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.volume = 0.22;
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 1.0);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    } catch (err) {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
  }

  tone(opts) {
    if (!this.ctx || this.muted) return;
    const { freq = 440, to = null, dur = 0.16, type = 'sine', vol = 0.3, delay = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise(opts) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const { dur = 0.15, vol = 0.3, freq = 1200, to = null, q = 1, type = 'bandpass', delay = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'jump':
        this.tone({ freq: 300, to: 560, dur: 0.15, type: 'triangle', vol: 0.16 });
        break;
      case 'doubleJump':
        this.tone({ freq: 460, to: 900, dur: 0.18, type: 'triangle', vol: 0.16 });
        this.noise({ dur: 0.12, vol: 0.08, freq: 2000, to: 5000, q: 0.8 });
        break;
      case 'slash':
        this.noise({ dur: 0.14, vol: 0.22, freq: 3200, to: 700, q: 1.2 });
        this.tone({ freq: 320, to: 90, dur: 0.1, type: 'triangle', vol: 0.1 });
        break;
      case 'hit':
        this.tone({ freq: 170, to: 55, dur: 0.13, type: 'sine', vol: 0.3 });
        this.noise({ dur: 0.08, vol: 0.22, freq: 700, to: 200, q: 0.6, type: 'lowpass' });
        break;
      case 'crit':
        this.tone({ freq: 880, to: 220, dur: 0.16, type: 'square', vol: 0.12 });
        this.noise({ dur: 0.16, vol: 0.24, freq: 4200, to: 800, q: 1.4 });
        break;
      case 'kill':
        this.noise({ dur: 0.28, vol: 0.25, freq: 900, to: 90, q: 0.7, type: 'lowpass' });
        this.tone({ freq: 120, to: 38, dur: 0.26, type: 'sawtooth', vol: 0.14 });
        break;
      case 'hurt':
        this.tone({ freq: 240, to: 80, dur: 0.26, type: 'sawtooth', vol: 0.2 });
        this.noise({ dur: 0.18, vol: 0.16, freq: 500, to: 140, type: 'lowpass' });
        break;
      case 'coin':
        this.tone({ freq: 1046, dur: 0.07, type: 'sine', vol: 0.14 });
        this.tone({ freq: 1568, dur: 0.1, type: 'sine', vol: 0.12, delay: 0.055 });
        break;
      case 'cell':
        this.tone({ freq: 660, to: 990, dur: 0.16, type: 'sine', vol: 0.15 });
        this.tone({ freq: 1320, dur: 0.18, type: 'triangle', vol: 0.08, delay: 0.07 });
        break;
      case 'heal':
        this.tone({ freq: 523, dur: 0.16, type: 'sine', vol: 0.14 });
        this.tone({ freq: 659, dur: 0.16, type: 'sine', vol: 0.14, delay: 0.08 });
        this.tone({ freq: 784, dur: 0.24, type: 'sine', vol: 0.14, delay: 0.16 });
        break;
      case 'door':
        this.tone({ freq: 110, to: 220, dur: 0.5, type: 'triangle', vol: 0.18 });
        this.noise({ dur: 0.5, vol: 0.12, freq: 400, to: 1800, q: 0.7 });
        break;
      case 'explode':
        this.noise({ dur: 0.5, vol: 0.4, freq: 1100, to: 80, q: 0.5, type: 'lowpass' });
        this.tone({ freq: 90, to: 28, dur: 0.42, type: 'sine', vol: 0.35 });
        break;
      case 'throw':
        this.noise({ dur: 0.12, vol: 0.12, freq: 900, to: 2400, q: 0.7 });
        break;
      case 'block':
        this.tone({ freq: 1450, dur: 0.06, type: 'square', vol: 0.12 });
        this.noise({ dur: 0.09, vol: 0.16, freq: 5200, to: 2200, q: 1.4 });
        break;
      case 'parry':
        this.tone({ freq: 2093, to: 1568, dur: 0.12, type: 'square', vol: 0.14 });
        this.tone({ freq: 3136, dur: 0.18, type: 'triangle', vol: 0.1, delay: 0.02 });
        this.noise({ dur: 0.14, vol: 0.2, freq: 6400, to: 2600, q: 1.6 });
        break;
      case 'equip':
        this.tone({ freq: 520, to: 780, dur: 0.1, type: 'triangle', vol: 0.12 });
        this.noise({ dur: 0.08, vol: 0.1, freq: 2400, to: 3600, q: 1 });
        break;
      case 'swap':
        this.noise({ dur: 0.1, vol: 0.12, freq: 1400, to: 3200, q: 0.9 });
        break;
      case 'nova':
        this.tone({ freq: 1180, to: 340, dur: 0.3, type: 'triangle', vol: 0.14 });
        this.noise({ dur: 0.32, vol: 0.14, freq: 4800, to: 900, q: 1.1 });
        break;
      case 'thunder':
        this.noise({ dur: 0.34, vol: 0.3, freq: 2600, to: 120, q: 0.6, type: 'lowpass' });
        this.tone({ freq: 130, to: 34, dur: 0.3, type: 'sawtooth', vol: 0.2 });
        break;
      case 'roll':
        this.noise({ dur: 0.2, vol: 0.14, freq: 700, to: 220, q: 0.6 });
        break;
      case 'death':
        this.tone({ freq: 180, to: 40, dur: 0.9, type: 'sawtooth', vol: 0.22 });
        this.noise({ dur: 0.8, vol: 0.2, freq: 800, to: 80, q: 0.6, type: 'lowpass' });
        break;
      case 'boss':
        this.tone({ freq: 80, to: 38, dur: 0.8, type: 'sawtooth', vol: 0.24 });
        this.noise({ dur: 0.7, vol: 0.18, freq: 300, to: 90, q: 0.5, type: 'lowpass' });
        break;
      case 'potion':
        this.tone({ freq: 330, to: 660, dur: 0.2, type: 'sine', vol: 0.1 });
        break;
      case 'levelup':
        this.tone({ freq: 523, dur: 0.14, type: 'triangle', vol: 0.14 });
        this.tone({ freq: 784, dur: 0.16, type: 'triangle', vol: 0.14, delay: 0.1 });
        this.tone({ freq: 1046, dur: 0.3, type: 'triangle', vol: 0.12, delay: 0.2 });
        break;
      case 'dash':
        this.noise({ dur: 0.14, vol: 0.12, freq: 1600, to: 400, q: 0.8 });
        break;
      default:
        break;
    }
  }
}

const sfx = new AudioKit();
