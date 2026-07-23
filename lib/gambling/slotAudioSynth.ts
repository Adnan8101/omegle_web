

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


  playLeverPull() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Heavy mechanical thunk — low sine thump.
      const thump = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(160, t);
      thump.frequency.exponentialRampToValueAtTime(45, t + 0.22);
      thumpGain.gain.setValueAtTime(0.0001, t);
      thumpGain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      thump.connect(thumpGain);
      thumpGain.connect(this.ctx.destination);
      thump.start(t);
      thump.stop(t + 0.32);

      // Metallic ratchet — short filtered noise burst.
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, t);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      source.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      source.start(t);
      source.stop(t + 0.15);
    } catch {

    }
  }


  playLeverReturn() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.06, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch {

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

  // Short tick used as symbols pass the payline while a reel spins.
  playReelClick() {
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(560, t + 0.03);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.04, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {

    }
  }

  private humNodes: { osc: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;

  // Low ambient machine hum so the cabinet always feels "powered on".
  startAmbientHum() {
    try {
      this.init();
      if (!this.ctx || this.humNodes) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, t);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(52, t);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(104, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.018, t + 1.2);
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc2.start(t);
      this.humNodes = { osc, osc2, gain };
    } catch {

    }
  }

  stopAmbientHum() {
    try {
      if (!this.ctx || !this.humNodes) return;
      const { osc, osc2, gain } = this.humNodes;
      const end = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(end);
      gain.gain.setValueAtTime(gain.gain.value, end);
      gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.4);
      osc.stop(end + 0.45);
      osc2.stop(end + 0.45);
      this.humNodes = null;
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
