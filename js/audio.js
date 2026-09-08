/* ==========================================================================
   BROTATO x VAMPIRE SURVIVORS: Web Audio API SFX Engine
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.25;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, startVol = 0.4, endFreq = null) {
    if (this.muted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playNoise(duration = 0.15, filterFreq = 1200) {
    if (this.muted || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start();
    } catch (e) {}
  }

  // Brotato & Vampire Survivor Sound Effects
  shootGun() {
    this.init();
    this.playNoise(0.08, 1800);
    this.playTone(350, 'sawtooth', 0.06, 0.3, 80);
  }

  laserShot() {
    this.init();
    this.playTone(900, 'sine', 0.1, 0.3, 200);
  }

  orbitalSlice() {
    this.init();
    this.playTone(600, 'sine', 0.08, 0.25, 300);
  }

  explosion() {
    this.init();
    this.playNoise(0.35, 400);
    this.playTone(90, 'sawtooth', 0.3, 0.5, 20);
  }

  gemPickup() {
    this.init();
    const freqs = [600, 800, 1000, 1200];
    const f = freqs[Math.floor(Math.random() * freqs.length)];
    this.playTone(f, 'sine', 0.06, 0.25);
  }

  levelUpFanfare() {
    this.init();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.18, 0.35), idx * 80);
    });
  }

  waveHorn() {
    this.init();
    this.playTone(150, 'sawtooth', 0.8, 0.4, 90);
  }

  buyShop() {
    this.init();
    this.playTone(880, 'sine', 0.08, 0.3);
    setTimeout(() => this.playTone(1174.66, 'sine', 0.12, 0.3), 60);
  }
}

const AudioSFX = new SoundEngine();
