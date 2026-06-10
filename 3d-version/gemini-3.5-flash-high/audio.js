// Procedural Audio Engine using the HTML5 Web Audio API
// No assets to load, works fully dynamically, low latency.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.volume = 0.5; // Default 50%
    
    this.musicTimer = null;
    this.musicActive = false;
    
    // Synthwave chord progression notes (MIDI frequencies)
    // Progression: Am -> F -> C -> G
    this.chords = [
      [110, 165, 220, 261.63], // Am: A2, E3, A3, C4
      [87.31, 130.81, 174.61, 220], // F: F2, C3, F3, A3
      [130.81, 196, 261.63, 329.63], // C: C3, G3, C4, E4
      [98, 146.83, 196, 246.94]  // G: G2, D3, G3, B3
    ];
    this.currentChordIndex = 0;
    this.activeSynthNotes = [];
  }

  // Initialize audio context on first user interaction
  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Create node graph
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime); // Music is slightly quieter
    this.musicGain.connect(this.masterGain);
    
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = parseFloat(vol);
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  setMute(mute) {
    this.isMuted = !!mute;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  // SFX: Bird flap (soft low-frequency woosh)
  playFlap() {
    this.init();
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    
    // Use an oscillator for the pitch sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60, time);
    // Quick sweep up then down
    osc.frequency.exponentialRampToValueAtTime(140, time + 0.05);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.8, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(time);
    osc.stop(time + 0.2);
  }

  // SFX: Scoring point (synth chime)
  playScore() {
    this.init();
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    
    // Classic retro chime: two sine waves slightly offset
    const playChimeNote = (freq, startTime, duration) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Synthesize beautiful two-note chime
    playChimeNote(659.25, time, 0.4);       // E5
    playChimeNote(987.77, time + 0.08, 0.6); // B5
  }

  // SFX: Crash explosion
  playCrash() {
    this.init();
    this.resume();
    if (!this.ctx || this.isMuted) return;

    const time = this.ctx.currentTime;
    
    // 1. Noise buffer for explosion rumble
    const bufferSize = this.ctx.sampleRate * 0.8; // 0.8 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    // Lowpass filter to make it sound bassy and deep
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + 0.5);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.0, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.75);
    
    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    
    // 2. Extra sine wave pitch drop for thud impact
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.linearRampToValueAtTime(30, time + 0.3);
    
    oscGain.gain.setValueAtTime(0.6, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    
    // Play both
    noiseNode.start(time);
    noiseNode.stop(time + 0.8);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  // Procedural Music: Ambient synth pads
  startMusic() {
    this.init();
    this.resume();
    if (!this.ctx || this.musicActive) return;

    this.musicActive = true;
    this.currentChordIndex = 0;
    this.playNextChord();
  }

  stopMusic() {
    this.musicActive = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.fadeActiveNotes();
  }

  playNextChord() {
    if (!this.musicActive || !this.ctx) return;

    const time = this.ctx.currentTime;
    const chord = this.chords[this.currentChordIndex];
    const duration = 6.0; // Chord length in seconds
    
    this.fadeActiveNotes();
    this.activeSynthNotes = [];

    // Play each note of the chord on a soft synth pad
    chord.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      // Warm, retro sounds with triangle and lowpass filter
      osc.type = index === 0 ? 'sawtooth' : 'triangle'; // Root note gets a little sawtooth buzz
      osc.frequency.setValueAtTime(freq, time);
      
      // Slow sweep filter
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(index === 0 ? 150 : 350, time);
      filter.frequency.linearRampToValueAtTime(index === 0 ? 300 : 700, time + duration * 0.5);
      filter.frequency.linearRampToValueAtTime(index === 0 ? 150 : 350, time + duration - 0.1);
      
      // Smooth attack
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 1.5); // Warm slow attack
      gain.gain.setValueAtTime(0.08, time + duration - 1.0); // Sustain
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      
      osc.start(time);
      
      this.activeSynthNotes.push({ osc, gain, stopTime: time + duration });
    });

    // Advance chord progression
    this.currentChordIndex = (this.currentChordIndex + 1) % this.chords.length;

    // Schedule next chord (overlap slightly by 0.5s for seamless crossfade)
    this.musicTimer = setTimeout(() => {
      this.playNextChord();
    }, (duration - 0.5) * 1000);
  }

  fadeActiveNotes() {
    if (!this.ctx) return;
    const time = this.ctx.currentTime;
    
    this.activeSynthNotes.forEach(note => {
      try {
        note.gain.gain.cancelScheduledValues(time);
        note.gain.gain.setValueAtTime(note.gain.gain.value, time);
        note.gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
        note.osc.stop(time + 0.6);
      } catch (e) {
        // Handle cases where osc was already stopped or not started
      }
    });
    this.activeSynthNotes = [];
  }
}

export const audio = new AudioEngine();
