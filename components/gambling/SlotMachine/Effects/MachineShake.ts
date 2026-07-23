// Decaying shake offset for the whole machine group. The scene polls a controller token and
// applies the returned offset to the cabinet group each frame (lever impact + big win).

export interface ShakeOffset {
  x: number;
  y: number;
  rz: number;
}

export class MachineShake {
  private elapsed = Infinity;
  private duration = 0.5;
  private mag = 0;
  private seen = 0;

  /** Start a shake if the token advanced. */
  poll(token: number, mag: number, duration = 0.5) {
    if (token !== this.seen) {
      this.seen = token;
      this.elapsed = 0;
      this.mag = mag;
      this.duration = duration;
    }
  }

  update(delta: number, time: number): ShakeOffset {
    if (this.elapsed >= this.duration) return { x: 0, y: 0, rz: 0 };
    this.elapsed += delta;
    const falloff = Math.max(0, 1 - this.elapsed / this.duration);
    const m = this.mag * falloff * falloff;
    return {
      x: Math.sin(time * 90) * m,
      y: Math.cos(time * 78) * m * 0.5,
      rz: Math.sin(time * 110) * m * 0.05,
    };
  }
}
