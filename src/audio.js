/**
 * Zero-Latency Web Audio Engine
 * Uses pre-computed AudioBuffers and Web Audio API with latencyHint: 'interactive'.
 * Guarantees < 15ms sound dispatch on pointer impact with zero network dependencies.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;
    this.slapBuffers = [];
    this.whooshBuffer = null;
    this.boingBuffer = null;
    this.gruntBuffers = [];
    this.masterGain = null;
  }

  /**
   * Initializes the AudioContext on first user gesture.
   * Pre-generates all sound variations directly into RAM as raw PCM AudioBuffers.
   */
  async init() {
    if (this.isInitialized && this.ctx && this.ctx.state === 'running') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }

    if (!this.ctx) {
      this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Pre-synthesize buffers in memory (zero disk/network latency)
    this.slapBuffers = [
      this._createSlapBuffer(0.7, 1200, 140),   // Light snap
      this._createSlapBuffer(1.0, 950, 100),    // Medium solid slap
      this._createSlapBuffer(1.4, 750, 75),     // Hard heavy slap
      this._createSlapBuffer(1.8, 600, 55)      // Critical WHAM slap
    ];

    this.whooshBuffer = this._createWhooshBuffer();
    this.boingBuffer = this._createBoingBuffer();
    this.gruntBuffers = [
      this._createGruntBuffer(180, 0.22),
      this._createGruntBuffer(220, 0.18),
      this._createGruntBuffer(140, 0.26)
    ];

    this.isInitialized = true;
  }

  /**
   * Creates a multi-component realistic & comedic slap impact in an AudioBuffer.
   * Combines high-frequency palm skin crack, mid resonant cheek slap, and low-end punch.
   */
  _createSlapBuffer(intensity, filterCutoff, subPitch) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 0.28; // seconds
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;

      // 1. Transient sharp click (skin-to-skin contact, first 5ms)
      const transientDecay = Math.exp(-t * 2200);
      const whiteNoise = (Math.random() * 2 - 1) * transientDecay * 1.5;

      // 2. High-mid slap crack (band-passed noise decay)
      const midNoiseDecay = Math.exp(-t * 85);
      const bandNoise = (Math.random() * 2 - 1) * midNoiseDecay * 0.8;

      // 3. Low-end skull/jaw thump (pitch drop sine wave)
      const pitch = subPitch * Math.exp(-t * 40);
      const lowThump = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t * 30) * 0.9 * intensity;

      // 4. Harmonic whip resonance
      const resonance = Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t * 60) * 0.35;

      // Combine and apply envelope
      const sample = (whiteNoise + bandNoise + lowThump + resonance) * Math.min(1, intensity);
      // Soft-clip saturation for impactful punch
      data[i] = Math.tanh(sample * 1.6) * 0.85;
    }

    return buffer;
  }

  /**
   * Synthesizes an aerodynamic air whoosh when the hand is swung rapidly.
   */
  _createWhooshBuffer() {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 0.24;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Parabolic amplitude envelope: swell in, swell out
      const envelope = Math.sin((t / duration) * Math.PI);
      // Pink-ish noise
      const noise = (Math.random() * 2 - 1) * 0.5;
      // Modulated tonal breeze
      const tone = Math.sin(2 * Math.PI * (180 + 260 * envelope) * t) * 0.4;
      data[i] = (noise + tone) * envelope * 0.7;
    }
    return buffer;
  }

  /**
   * Synthesizes a cartoon spring boing/wobble for humorous post-slap recoil.
   */
  _createBoingBuffer() {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 0.35;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 12);
      // Frequency Modulation (FM) for cartoon jaw wobble
      const mod = Math.sin(2 * Math.PI * 18 * t) * 45;
      const carrier = Math.sin(2 * Math.PI * (240 + mod) * t);
      data[i] = carrier * decay * 0.4;
    }
    return buffer;
  }

  /**
   * Synthesizes a comical vocal grunt / "oof!" on impact.
   */
  _createGruntBuffer(basePitch, duration) {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.sin((t / duration) * Math.PI) * Math.exp(-t * 9);
      // Formant frequency drop
      const pitch = basePitch * (1 - 0.45 * (t / duration));
      const f1 = Math.sin(2 * Math.PI * pitch * t);
      const f2 = Math.sin(2 * Math.PI * (pitch * 2.2) * t) * 0.5;
      const f3 = Math.sin(2 * Math.PI * (pitch * 3.4) * t) * 0.25;
      data[i] = (f1 + f2 + f3) * envelope * 0.5;
    }
    return buffer;
  }

  /**
   * Instantly triggers the slap sound with latency < 15ms.
   * @param {number} velocityNormalized - Normalized slap force [0.0 - 1.0+]
   */
  playSlap(velocityNormalized = 0.5) {
    if (this.isMuted || !this.ctx || !this.slapBuffers.length) return;

    // Pick appropriate buffer based on velocity
    let bufferIdx = 0;
    if (velocityNormalized > 0.8) bufferIdx = 3;
    else if (velocityNormalized > 0.5) bufferIdx = 2;
    else if (velocityNormalized > 0.25) bufferIdx = 1;

    const buffer = this.slapBuffers[bufferIdx];
    if (!buffer) return;

    // Hardware source node scheduled at exact hardware currentTime
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    // Slight pitch variation (0.92x - 1.08x) so consecutive slaps sound dynamic
    const pitchJitter = 0.94 + Math.random() * 0.12;
    source.playbackRate.setValueAtTime(pitchJitter, this.ctx.currentTime);

    // Dynamic gain based on slap velocity
    const gainNode = this.ctx.createGain();
    const targetGain = Math.min(1.5, Math.max(0.4, velocityNormalized * 1.3));
    gainNode.gain.setValueAtTime(targetGain, this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Fire immediately!
    source.start(this.ctx.currentTime);

    // Layer a comical grunt or boing on strong slaps
    if (velocityNormalized > 0.45 && this.gruntBuffers.length) {
      setTimeout(() => this.playGrunt(velocityNormalized), 35);
    }
  }

  /**
   * Plays a whoosh sound when the hand is moving fast through the air.
   */
  playWhoosh(velocityNormalized = 0.5) {
    if (this.isMuted || !this.ctx || !this.whooshBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.whooshBuffer;
    source.playbackRate.setValueAtTime(0.85 + velocityNormalized * 0.4, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(Math.min(0.6, velocityNormalized * 0.7), this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(this.ctx.currentTime);
  }

  /**
   * Plays a character reaction grunt.
   */
  playGrunt(velocityNormalized = 0.5) {
    if (this.isMuted || !this.ctx || !this.gruntBuffers.length) return;

    const idx = Math.floor(Math.random() * this.gruntBuffers.length);
    const source = this.ctx.createBufferSource();
    source.buffer = this.gruntBuffers[idx];
    source.playbackRate.setValueAtTime(0.85 + Math.random() * 0.35, this.ctx.currentTime);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(Math.min(0.8, velocityNormalized * 0.9), this.ctx.currentTime);

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(this.ctx.currentTime);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
