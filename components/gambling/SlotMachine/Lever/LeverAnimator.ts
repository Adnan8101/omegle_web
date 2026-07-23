// Heavy, non-linear lever pull timeline: down → mechanical impact → small bounce → slow return.
// Angles in radians about the hinge. Fed elapsed seconds; reports when to fire onPull / impact.

const DEG = Math.PI / 180;

interface Key {
  t: number; // seconds
  a: number; // angle (rad)
}

// Mirrors the previous machine's feel: quick heavy drop, overshoot past bottom, settle, slow return.
const KEYS: Key[] = [
  { t: 0, a: 0 },
  { t: 0.2, a: 58 * DEG },
  { t: 0.35, a: 66 * DEG },
  { t: 0.42, a: 60 * DEG },
  { t: 0.9, a: 0 },
];

const IMPACT_T = 0.35; // peak / mechanical impact
const FIRE_T = 0.33; // when the spin request is sent
export const PULL_DURATION = 0.9;

function smoothstep(x: number): number {
  return x * x * (3 - 2 * x);
}

export class LeverAnimator {
  angle = 0;
  private elapsed = 0;
  private active = false;
  private firedPull = false;
  private firedImpact = false;

  start() {
    this.elapsed = 0;
    this.active = true;
    this.firedPull = false;
    this.firedImpact = false;
  }

  get isActive() {
    return this.active;
  }

  /** Advance the pull; returns edge flags for this frame. */
  tick(delta: number): { firePull: boolean; fireImpact: boolean; finished: boolean } {
    if (!this.active) return { firePull: false, fireImpact: false, finished: false };
    this.elapsed += delta;
    const t = this.elapsed;

    // sample piecewise smoothstep
    let a = KEYS[KEYS.length - 1].a;
    for (let i = 0; i < KEYS.length - 1; i++) {
      const k0 = KEYS[i];
      const k1 = KEYS[i + 1];
      if (t >= k0.t && t <= k1.t) {
        const local = (t - k0.t) / (k1.t - k0.t);
        a = k0.a + (k1.a - k0.a) * smoothstep(local);
        break;
      }
    }
    this.angle = a;

    let firePull = false;
    let fireImpact = false;
    if (!this.firedPull && t >= FIRE_T) {
      this.firedPull = true;
      firePull = true;
    }
    if (!this.firedImpact && t >= IMPACT_T) {
      this.firedImpact = true;
      fireImpact = true;
    }

    let finished = false;
    if (t >= PULL_DURATION) {
      this.active = false;
      this.angle = 0;
      finished = true;
    }
    return { firePull, fireImpact, finished };
  }

  /** Gentle idle sway when the lever is armed but not being pulled. */
  idle(time: number) {
    this.angle = Math.sin(time * 1.3) * 0.03;
  }
}
