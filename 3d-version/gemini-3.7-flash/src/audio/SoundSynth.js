/**
 * SoundSynth - Zero-dependency, procedural Web Audio synthesizer
 * Provides procedural sound effects and dynamic generative background music.
 */
export class SoundSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isMuted = false;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.35;
    this.isInitialized = false;

    // Music playback state
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgmPlaying = false;
    this.bgmTheme = 'SUNSET';
    this.currentBpm = 118;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.isInitialized = true;
    } catch (e) {
      console.warn('AudioContext initialization failed:', e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.ctx.currentTime, 0.05);
    }
  }

  // --- SOUND EFFECTS ---

  /**
   * Snappy, cute upward whoosh & chirping wing flap
   */
  playFlap() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Low whoosh oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.09);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);

    // High chirp sparkle
    const chirp = this.ctx.createOscillator();
    const chirpGain = this.ctx.createGain();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(580, t + 0.02);
    chirp.frequency.exponentialRampToValueAtTime(1200, t + 0.08);

    chirpGain.gain.setValueAtTime(0.18, t + 0.02);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    chirp.connect(chirpGain);
    chirpGain.connect(this.sfxGain);

    chirp.start(t + 0.02);
    chirp.stop(t + 0.11);
  }

  /**
   * Harmonious rewarding score chime with combo pitch boost
   */
  playScore(combo = 1) {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const baseFreqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const pitchShift = Math.min(combo - 1, 8) * 1.059463; // Half-step scale
    const root = baseFreqs[Math.min(combo % 4, baseFreqs.length - 1)] * (1 + (combo > 4 ? 0.2 : 0));

    // Two harmonic sine waves
    [root, root * 1.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.03);

      gain.gain.setValueAtTime(0.28, t + idx * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.03 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.03);
      osc.stop(t + idx * 0.03 + 0.36);
    });
  }

  /**
   * Passing through golden hoop ring
   */
  playRing() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const freqs = [880, 1108.73, 1318.51, 1760]; // A major arpeggio
    
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.04);
      
      gain.gain.setValueAtTime(0.22, t + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.26);
    });
  }

  /**
   * Collecting a gem/coin
   */
  playCoin() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, t); // B5
    osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.26);
  }

  /**
   * Picking up a powerup item
   */
  playPowerup() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.12, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.22);
    });
  }

  /**
   * Shield absorbs hit
   */
  playShieldBreak() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  /**
   * Near miss adrenaline tick
   */
  playNearMiss() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  /**
   * Impact crash sound with deep punch and noise debris
   */
  playHit() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Sub thud
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.35);

    subGain.gain.setValueAtTime(0.6, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.41);

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.26);
  }

  /**
   * UI Click
   */
  playClick() {
    this.ensureContext();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // --- DYNAMIC MUSIC GENERATOR ---

  startBGM(theme = 'SUNSET') {
    this.ensureContext();
    this.bgmTheme = theme;
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;
    this.scheduleNextBgmBeat();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setTheme(theme) {
    this.bgmTheme = theme;
  }

  scheduleNextBgmBeat() {
    if (!this.bgmPlaying || !this.ctx) return;

    const stepDuration = 60 / this.currentBpm / 4; // 16th notes
    this.playMusicStep(this.bgmStep, this.bgmTheme);

    this.bgmStep = (this.bgmStep + 1) % 32;
    this.bgmTimer = setTimeout(() => {
      this.scheduleNextBgmBeat();
    }, stepDuration * 1000);
  }

  playMusicStep(step, theme) {
    if (this.isMuted || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Theme Chord Progressions & Arpeggios
    let scale;
    if (theme === 'CYBER') {
      // D minor / Phrygian cyberpunk vibe
      scale = [146.83, 164.81, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0];
    } else if (theme === 'NEBULA') {
      // F# minor ethereal synthwave
      scale = [185.0, 220.0, 246.94, 277.18, 329.63, 369.99, 440.0, 493.88];
    } else if (theme === 'VOLCANIC') {
      // E minor driving energetic rock/synth
      scale = [164.81, 196.0, 220.0, 246.94, 329.63, 392.0, 493.88];
    } else {
      // C Major / Lydian uplifting sunset
      scale = [130.81, 164.81, 196.0, 220.0, 261.63, 329.63, 392.0, 523.25];
    }

    // Bassline on every 4th step or syncopated
    if (step % 4 === 0 || step % 8 === 6) {
      const rootIdx = Math.floor(step / 8) % 4;
      const bassFreq = scale[rootIdx % scale.length] * 0.5;
      
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      const bassFilter = this.ctx.createBiquadFilter();

      bassOsc.type = theme === 'CYBER' ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, t);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(theme === 'CYBER' ? 600 : 350, t);

      bassGain.gain.setValueAtTime(0.2, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(t);
      bassOsc.stop(t + 0.24);
    }

    // Melodic Arpeggio Pattern (steps 0, 2, 4, 6, 8, 10...)
    if (step % 2 === 0) {
      const arpPatterns = [0, 2, 4, 7, 5, 3, 2, 4, 1, 3, 5, 8, 6, 4, 3, 5];
      const noteIdx = arpPatterns[step % arpPatterns.length];
      const arpFreq = scale[noteIdx % scale.length] * (theme === 'NEBULA' ? 2 : 1.5);

      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'sine';
      arpOsc.frequency.setValueAtTime(arpFreq, t);

      arpGain.gain.setValueAtTime(0.06, t);
      arpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      arpOsc.connect(arpGain);
      arpGain.connect(this.musicGain);

      arpOsc.start(t);
      arpOsc.stop(t + 0.13);
    }

    // Soft Hat/Percussion pulse
    if (step % 4 === 2) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(4000, t);
      hatGain.gain.setValueAtTime(0.025, t);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      hatOsc.connect(hatGain);
      hatGain.connect(this.musicGain);
      hatOsc.start(t);
      hatOsc.stop(t + 0.035);
    }
  }
}
