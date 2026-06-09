// Web Audio API sound engine — all sounds generated programmatically
const Audio = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone({ type = 'sine', freq = 440, endFreq, duration = 0.15, gain = 0.4, attack = 0.005, decay = 0.05, shape = 'linear' }) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gainNode = ac.createGain();
    osc.connect(gainNode);
    gainNode.connect(ac.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (endFreq !== undefined) {
      if (shape === 'exp') {
        osc.frequency.exponentialRampToValueAtTime(endFreq, ac.currentTime + duration);
      } else {
        osc.frequency.linearRampToValueAtTime(endFreq, ac.currentTime + duration);
      }
    }

    gainNode.gain.setValueAtTime(0, ac.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, ac.currentTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + duration + 0.01);
  }

  function flap() {
    // Quick upward chirp
    playTone({ type: 'square', freq: 300, endFreq: 600, duration: 0.08, gain: 0.25, attack: 0.002 });
  }

  function score() {
    // Two-note ascending ding
    playTone({ type: 'sine', freq: 660, endFreq: 880, duration: 0.12, gain: 0.5, attack: 0.003 });
    setTimeout(() => playTone({ type: 'sine', freq: 880, endFreq: 1100, duration: 0.18, gain: 0.4, attack: 0.003 }), 80);
  }

  function hit() {
    // Low thud
    playTone({ type: 'sawtooth', freq: 220, endFreq: 40, duration: 0.25, gain: 0.6, attack: 0.001, shape: 'exp' });
  }

  function die() {
    // Descending whine
    playTone({ type: 'square', freq: 500, endFreq: 80, duration: 0.5, gain: 0.35, attack: 0.002, shape: 'exp' });
  }

  return { flap, score, hit, die };
})();
