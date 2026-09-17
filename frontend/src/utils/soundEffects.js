/**
 * UIU Rescue Rover Team (#URRT) - Tactical Web Audio Synthesizer
 * Generates futuristic HUD audio cues without needing any external audio assets.
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  _init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(mute) {
    this.muted = mute;
  }

  isMuted() {
    return this.muted;
  }

  // Tactical HUD button click chirp
  playChirp() {
    if (this.muted) return;
    try {
      this._init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {}
  }

  // Camera Snapshot shutter sound
  playShutter() {
    if (this.muted) return;
    try {
      this._init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.setValueAtTime(600, t + 0.05);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  // Hazard Alert double beep
  playHazardAlarm() {
    if (this.muted) return;
    try {
      this._init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      [0, 0.12].forEach(offset => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t + offset);

        gain.gain.setValueAtTime(0.1, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + offset);
        osc.stop(t + offset + 0.09);
      });
    } catch (e) {}
  }
}

export const soundManager = new SoundManager();
export default soundManager;
