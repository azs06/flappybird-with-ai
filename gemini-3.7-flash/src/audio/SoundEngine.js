// ============================================================================
// SoundEngine.js - High-Fidelity Procedural Web Audio Synthesizer
// ============================================================================

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.musicFilter = null;

    this.masterVolume = 0.8;
    this.sfxVolume = 0.9;
    this.musicVolume = 0.5;
    this.isMuted = false;
    this.musicEnabled = true;

    this.isPlayingMusic = false;
    this.musicInterval = null;
    this.musicStep = 0;
    this.musicBpm = 124;
    this.musicMode = 'arcade'; // 'arcade', 'boss', 'zen', 'hyper'

    // Chord progressions for procedural music
    this.scales = {
      arcade: [
        [220, 261.63, 329.63, 392.00], // Am7
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [261.63, 329.63, 392.00, 523.25], // Cmaj
        [196.00, 246.94, 293.66, 392.00]  // Gmaj
      ],
      boss: [
        [110, 130.81, 155.56, 220], // Diminished tense
        [123.47, 146.83, 174.61, 246.94],
        [98.00, 116.54, 146.83, 196.00],
        [87.31, 110.00, 130.81, 174.61]
      ],
      zen: [
        [196.00, 246.94, 293.66, 369.99], // Gmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [246.94, 293.66, 369.99, 440.00], // Bm7
        [261.63, 329.63, 392.00, 493.88]  // Cmaj7
      ],
      hyper: [
        [220, 261.63, 329.63, 440],
        [246.94, 293.66, 369.99, 493.88],
        [261.63, 329.63, 392.00, 523.25],
        [293.66, 349.23, 440.00, 587.33]
      ]
    };

    this.initAudioContext();
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const setup = () => {
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.musicFilter = this.ctx.createBiquadFilter();

        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 4000;
        this.musicFilter.Q.value = 1;

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.musicFilter);
        this.musicFilter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.updateVolumes();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    };

    window.addEventListener('click', setup, { once: true });
    window.addEventListener('keydown', setup, { once: true });
    window.addEventListener('touchstart', setup, { once: true });
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.musicFilter = this.ctx.createBiquadFilter();

        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 4000;

        this.sfxGain.connect(this.masterGain);
        this.musicGain.connect(this.musicFilter);
        this.musicFilter.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.updateVolumes();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  updateVolumes() {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    const master = this.isMuted ? 0 : this.masterVolume;
    this.masterGain.gain.setValueAtTime(master, now);
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    this.musicGain.gain.setValueAtTime(this.musicEnabled ? this.musicVolume : 0, now);
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    this.updateVolumes();
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    this.updateVolumes();
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    this.updateVolumes();
  }

  setMuted(muted) {
    this.isMuted = muted;
    this.updateVolumes();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this.updateVolumes();
    if (!enabled && this.isPlayingMusic) {
      this.stopMusic();
    } else if (enabled && !this.isPlayingMusic) {
      this.startMusic();
    }
  }

  // ==========================================================================
  // PROCEDURAL SOUND EFFECTS
  // ==========================================================================

  playFlap(pitchMultiplier = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted || this.sfxVolume === 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(580 * pitchMultiplier, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);

    // Subtle air noise puff
    this.playNoisePuff(now, 0.06, 0.12);
  }

  playNoisePuff(time, duration, volume) {
    const ctx = this.ctx;
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(2, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(time);
  }

  playScore(combo = 1) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const baseFreq = 523.25; // C5
    const pitchOffset = Math.min(combo - 1, 8) * 40;

    // Dual chime tones
    [0, 0.06].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const freq = (idx === 0 ? baseFreq : baseFreq * 1.5) + pitchOffset;
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.18);
    });
  }

  playCoin() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const freqs = [987.77, 1318.51]; // B5, E6

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.3, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.22);
    });
  }

  playGraze() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.09);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  playPowerup(type = 'default') {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.15, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.18);
    });
  }

  playShieldHit() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  playLaser() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(950, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playExplosion(intensity = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const duration = 0.45 * intensity;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(60, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);

    // Deep sub-bass punch
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    subGain.gain.setValueAtTime(0.4 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    sub.start(now);
    sub.stop(now + 0.25);
  }

  playHit() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  playDie() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playBossWarning() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, now + delay);
      osc.frequency.exponentialRampToValueAtTime(440, now + delay + 0.18);

      gain.gain.setValueAtTime(0.3, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  }

  playBossLaser() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.8);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.85);
  }

  playButton() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  playLevelUp() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  // ==========================================================================
  // ADAPTIVE PROCEDURAL SYNTHWAVE / AMBIENT BGM
  // ==========================================================================

  setMusicMode(mode) {
    if (this.scales[mode]) {
      this.musicMode = mode;
      if (mode === 'boss') this.musicBpm = 138;
      else if (mode === 'hyper') this.musicBpm = 148;
      else if (mode === 'zen') this.musicBpm = 90;
      else this.musicBpm = 124;

      if (this.isPlayingMusic) {
        this.restartMusicTimer();
      }
    }
  }

  startMusic() {
    if (this.isPlayingMusic || !this.musicEnabled) return;
    this.ensureContext();
    this.isPlayingMusic = true;
    this.musicStep = 0;
    this.restartMusicTimer();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  restartMusicTimer() {
    if (this.musicInterval) clearInterval(this.musicInterval);
    const stepDurationMs = (60 / this.musicBpm / 4) * 1000; // 16th notes
    this.musicInterval = setInterval(() => {
      this.tickMusic();
    }, stepDurationMs);
  }

  tickMusic() {
    const ctx = this.ctx;
    if (!ctx || !this.isPlayingMusic || !this.musicEnabled || this.isMuted) return;

    const now = ctx.currentTime;
    const currentProgression = this.scales[this.musicMode] || this.scales.arcade;
    const barIndex = Math.floor(this.musicStep / 16) % currentProgression.length;
    const stepInBar = this.musicStep % 16;
    const currentChord = currentProgression[barIndex];

    // Bassline on 16th rhythm
    if (stepInBar % 2 === 0) {
      const bassRoot = currentChord[0] / 2;
      const bassOctave = (stepInBar % 4 === 2) ? bassRoot * 2 : bassRoot;
      this.playSynthNote(bassOctave, now, 0.12, 'sawtooth', 0.12, 400);
    }

    // Arpeggiator Lead
    if (this.musicMode !== 'zen' || stepInBar % 4 === 0) {
      const noteIdx = stepInBar % currentChord.length;
      const arpFreq = currentChord[noteIdx] * (this.musicMode === 'zen' ? 1 : 2);
      this.playSynthNote(arpFreq, now, 0.08, 'square', 0.06, 2500);
    }

    // Percussion (Kick, Snare, Hi-hat) synthesized
    if (this.musicMode !== 'zen') {
      // Kick on 0, 4, 8, 12
      if (stepInBar % 4 === 0) {
        this.playDrumKick(now);
      }
      // Snare on 4, 12
      if (stepInBar === 4 || stepInBar === 12) {
        this.playDrumSnare(now);
      }
      // Hi-hat on every offbeat
      if (stepInBar % 2 === 1) {
        this.playDrumHihat(now);
      }
    }

    this.musicStep++;
  }

  playSynthNote(freq, time, duration, type = 'sawtooth', volume = 0.1, filterCutoff = 1500) {
    const ctx = this.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterCutoff, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  playDrumKick(time) {
    const ctx = this.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.1);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.12);
  }

  playDrumSnare(time) {
    const ctx = this.ctx;
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.1;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
  }

  playDrumHihat(time) {
    const ctx = this.ctx;
    if (!ctx) return;

    const bufferSize = ctx.sampleRate * 0.03;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6000, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
  }
}
