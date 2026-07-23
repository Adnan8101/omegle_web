

export class SlotAudioSynth {
  private ctx: AudioContext | null = null;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  
  playSpinLoop(): () => void {
    try {
      this.init();
      if (!this.ctx) return () => {};
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, t);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(18, t);
      lfoGain.gain.setValueAtTime(14, t);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      lfo.start(t);
      return () => {
        try {
          if (!this.ctx) return;
          const end = this.ctx.currentTime;
          gain.gain.cancelScheduledValues(end);
          gain.gain.setValueAtTime(gain.gain.value, end);
          gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
          osc.stop(end + 0.15);
          lfo.stop(end + 0.15);
        } catch {
          
        }
      };
    } catch {
      return () => {};
    }
  }

  
  playReelStop() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {
      
    }
  }

  
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
    } catch {
      
    }
  }

  
  playLose() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, t);
      osc.frequency.exponentialRampToValueAtTime(174, t + 0.45);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    } catch {
      
    }
  }
}
