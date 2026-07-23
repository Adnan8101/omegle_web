// Web Audio synth for the Spin-the-Wheel UI. No audio files — every sound is
// synthesized, matching the house pattern in components/CrateReveal.tsx.
// Client-only (constructs AudioContext lazily on first user gesture).

export class WheelAudioSynth {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    // Resume if the browser suspended the context (autoplay policies).
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Short click as the pointer passes each segment during a spin. */
  playTick(intensity: number = 1) {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880 + Math.min(1, intensity) * 220, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.06 * Math.min(1, intensity) + 0.02, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.07);
    } catch (err) {
      /* ignore audio errors */
    }
  }

  /** Rising whoosh when a spin launches. */
  playSpinStart() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.5);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    } catch (err) {
      /* ignore audio errors */
    }
  }

  /** Celebratory arpeggio when a reward lands. `big` adds a brighter fanfare. */
  playWin(big: boolean = false) {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const freqs = big
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98]
        : [392.0, 523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        const start = t + idx * 0.07;
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.4, start + 0.5);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.14, start + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(start);
        osc.stop(start + 1.3);
      });

      if (big) {
        // Shimmer sweep for jackpot-tier wins.
        const bufferSize = this.ctx.sampleRate * 1.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, t);
        filter.frequency.exponentialRampToValueAtTime(6000, t + 0.6);
        const sweepGain = this.ctx.createGain();
        sweepGain.gain.setValueAtTime(0.12, t);
        sweepGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
        source.connect(filter);
        filter.connect(sweepGain);
        sweepGain.connect(this.ctx.destination);
        source.start(t);
        source.stop(t + 1.1);
      }
    } catch (err) {
      /* ignore audio errors */
    }
  }

  /** Soft descending tone for a zero / "no win" result. */
  playNoWin() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, t);
      osc.frequency.exponentialRampToValueAtTime(196, t + 0.4);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    } catch (err) {
      /* ignore audio errors */
    }
  }
}
