/**
 * Retro Arcade Audio Synthesizer using Web Audio API
 * Generates retro 8-bit sound effects programmatically.
 */
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    /**
     * Initialize Audio Context on user gesture
     */
    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        } catch (e) {
            console.warn("Web Audio API not supported in this browser", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    /**
     * Play flap/jump sound effect
     * Short upward frequency sweep
     */
    playFlap() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        
        // Triangle wave for a clean, retro feel
        osc.type = 'triangle';
        
        // Rapid pitch sweep up from 180Hz to 420Hz in 0.12 seconds
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);

        // Volume envelope (quick fade)
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.start(now);
        osc.stop(now + 0.13);
    }

    /**
     * Play score sound effect
     * A bright two-tone chime (classic retro coin sound)
     */
    playScore() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        
        // First tone (high-pitched C5 / ~523Hz)
        this.playTone(523.25, 0.08, 'square', 0.15, now);
        
        // Second tone (even higher G5 / ~784Hz) starting slightly after
        this.playTone(783.99, 0.22, 'square', 0.15, now + 0.08);
    }

    /**
     * Helper to play a single tone
     */
    playTone(frequency, duration, type, volume, startTime) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, startTime);
        
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);
    }

    /**
     * Play crash/collision sound effect
     * Combines noise-like rapid pitch sweep and distortion
     */
    playCollide() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const duration = 0.4;

        // Create oscillator for the rumble and descending sweep
        const osc = this.ctx.createOscillator();
        const noise = this.createNoiseNode();
        const oscGain = this.ctx.createGain();
        const noiseGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        // Setup routing
        osc.connect(oscGain);
        oscGain.connect(filter);

        if (noise) {
            noise.connect(noiseGain);
            noiseGain.connect(filter);
        }

        filter.connect(this.ctx.destination);

        // Lowpass filter sweeping down to make it sound muffled/heavy
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + duration);

        // Pitch sweep for oscillator: start mid-low and dive
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(40, now + duration);

        // Volume envelopes
        oscGain.gain.setValueAtTime(0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        if (noise) {
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        }

        // Start & Stop
        osc.start(now);
        osc.stop(now + duration + 0.02);

        if (noise) {
            noise.start(now);
            noise.stop(now + duration + 0.02);
        }
    }

    /**
     * Helper to create a white noise buffer
     */
    createNoiseNode() {
        if (!this.ctx) return null;
        
        const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Fill buffer with random noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        return source;
    }

    /**
     * Play game over song/melancholy sequence
     */
    playGameOver() {
        if (this.muted || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        
        // Tragic descending arpeggio: A4 -> F4 -> D4 -> Bb3
        const notes = [440.00, 349.23, 293.66, 233.08];
        const step = 0.15;
        
        notes.forEach((freq, index) => {
            const time = now + (index * step);
            const duration = (index === notes.length - 1) ? 0.6 : 0.25;
            const vol = (index === notes.length - 1) ? 0.25 : 0.2;
            this.playTone(freq, duration, 'sawtooth', vol, time);
        });
    }
}

// Make globally available
window.sounds = new SoundSynth();
