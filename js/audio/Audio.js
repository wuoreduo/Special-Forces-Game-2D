// 音频系统 - 使用 Web Audio API 合成音效，无需外部文件

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.sounds = {};
  }

  // 初始化音频上下文（需要用户交互后调用）
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // 播放射击音效
  playShoot(weaponType) {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    
    switch (weaponType) {
      case 'pistol':
        this._playPistolSound(now);
        break;
      case 'smg':
        this._playSMGSound(now);
        break;
      case 'rifle':
        this._playRifleSound(now);
        break;
      case 'sniper':
        this._playSniperSound(now);
        break;
      case 'shotgun':
        this._playShotgunSound(now);
        break;
    }
  }

  _playPistolSound(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.linearRampToValueAtTime(500, now + 0.1);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  _playSMGSound(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const noise = this._createNoiseBuffer();

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    noiseGain.gain.setValueAtTime(0.15, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    noiseNode.start(now);
    osc.start(now);
    osc.stop(now + 0.08);
    noiseNode.stop(now + 0.08);
  }

  _playRifleSound(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const noise = this._createNoiseBuffer();

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2000;

    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noiseNode.start(now);
    osc.start(now);
    osc.stop(now + 0.12);
    noiseNode.stop(now + 0.12);
  }

  _playSniperSound(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const noise = this._createNoiseBuffer();

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 800;

    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    noiseNode.start(now);
    osc.start(now);
    osc.stop(now + 0.3);
    noiseNode.stop(now + 0.3);
  }

  _playShotgunSound(now) {
    const noise = this._createNoiseBuffer();
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 2000;

    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    noiseNode.start(now);
    noiseNode.stop(now + 0.4);
  }

  _createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  // 播放命中音效
  playHit() {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 播放换弹音效
  playReload() {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.2);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // 播放近战音效
  playMelee() {
    if (!this.enabled || !this.ctx) return;

    const now = this.ctx.currentTime;
    const noise = this._createNoiseBuffer();
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noise;
    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.ctx.createBiquadFilter();

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;

    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    noiseNode.start(now);
    noiseNode.stop(now + 0.1);
  }

  // 启用/禁用音频
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // 切换音频
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// 全局实例
window.AudioSystem = new AudioSystem();
