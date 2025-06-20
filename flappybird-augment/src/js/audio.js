// 🎮 Flappy Bird Clone - Audio Manager
// Handles sound effects and background music

import { AUDIO } from './constants.js';

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = new Map();
        this.isMuted = false;
        this.masterVolume = AUDIO.MASTER_VOLUME;
        this.sfxVolume = AUDIO.SFX_VOLUME;
        this.musicVolume = AUDIO.MUSIC_VOLUME;
        
        // Check for audio support
        this.isSupported = this.checkAudioSupport();
    }
    
    // Initialize audio system
    async init() {
        if (!this.isSupported) {
            console.warn('Audio not supported in this browser');
            return;
        }
        
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create sound effects using oscillators (no external files needed)
            this.createSoundEffects();
            
            console.log('🔊 Audio system initialized');
            
        } catch (error) {
            console.warn('Failed to initialize audio:', error);
            this.isSupported = false;
        }
    }
    
    // Check if audio is supported
    checkAudioSupport() {
        return !!(window.AudioContext || window.webkitAudioContext);
    }
    
    // Create sound effects using Web Audio API oscillators
    createSoundEffects() {
        // Jump sound - quick upward sweep
        this.sounds.set('jump', {
            type: 'oscillator',
            frequency: 400,
            endFrequency: 600,
            duration: 0.1,
            volume: 0.3,
            waveType: 'square'
        });
        
        // Score sound - pleasant ding
        this.sounds.set('score', {
            type: 'oscillator',
            frequency: 800,
            endFrequency: 1000,
            duration: 0.2,
            volume: 0.4,
            waveType: 'sine'
        });
        
        // Hit sound - harsh noise
        this.sounds.set('hit', {
            type: 'oscillator',
            frequency: 150,
            endFrequency: 50,
            duration: 0.3,
            volume: 0.5,
            waveType: 'sawtooth'
        });
        
        // Swoosh sound - wind effect
        this.sounds.set('swoosh', {
            type: 'noise',
            duration: 0.15,
            volume: 0.2
        });
    }
    
    // Play a sound effect
    playSound(soundName) {
        if (!this.isSupported || this.isMuted || !this.audioContext) {
            return;
        }
        
        const soundConfig = this.sounds.get(soundName);
        if (!soundConfig) {
            console.warn(`Sound '${soundName}' not found`);
            return;
        }
        
        try {
            if (soundConfig.type === 'oscillator') {
                this.playOscillatorSound(soundConfig);
            } else if (soundConfig.type === 'noise') {
                this.playNoiseSound(soundConfig);
            }
        } catch (error) {
            console.warn(`Failed to play sound '${soundName}':`, error);
        }
    }
    
    // Play oscillator-based sound
    playOscillatorSound(config) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Configure oscillator
        oscillator.type = config.waveType || 'sine';
        oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);
        
        if (config.endFrequency) {
            oscillator.frequency.exponentialRampToValueAtTime(
                config.endFrequency,
                this.audioContext.currentTime + config.duration
            );
        }
        
        // Configure gain (volume)
        const volume = config.volume * this.sfxVolume * this.masterVolume;
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + config.duration
        );
        
        // Play sound
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + config.duration);
    }
    
    // Play noise-based sound (for wind effects)
    playNoiseSound(config) {
        const bufferSize = this.audioContext.sampleRate * config.duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.1; // Quiet white noise
        }
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Configure filter for wind-like sound
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
        
        // Connect nodes
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Configure gain
        const volume = config.volume * this.sfxVolume * this.masterVolume;
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            this.audioContext.currentTime + config.duration
        );
        
        // Play sound
        source.start(this.audioContext.currentTime);
    }
    
    // Toggle mute state
    toggleMute() {
        this.isMuted = !this.isMuted;
        console.log(`🔊 Audio ${this.isMuted ? 'muted' : 'unmuted'}`);
        return this.isMuted;
    }
    
    // Set master volume
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Set SFX volume
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Set music volume
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Resume audio context (required for some browsers)
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    // Get audio state info
    getAudioInfo() {
        return {
            supported: this.isSupported,
            muted: this.isMuted,
            masterVolume: this.masterVolume,
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            contextState: this.audioContext?.state || 'not initialized'
        };
    }
    
    // Cleanup audio resources
    destroy() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.sounds.clear();
    }
}
