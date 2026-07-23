import {
  DEFAULT_TIMING,
  REDUCED_TIMING,
  TWO_PI,
  easeOutBack,
  frontIndex,
  solveLandingRotation,
  type ReelTiming,
} from './ReelPhysics';

type Phase = 'idle' | 'spinning' | 'stopping' | 'stopped';

export interface ReelTickResult {
  rotation: number;
  /** true only on the frame the reel finishes settling */
  justStopped: boolean;
  /** true when a symbol clicked past the payline this frame (slow phase only) */
  clicked: boolean;
  /** current normalized angular speed 0..1, for motion-blur intensity */
  speed01: number;
}

/**
 * Drives one reel through accelerate → steady → decelerate → land → settle.
 * Fed a frame delta each tick; owns its own rotation so React never re-renders per frame.
 */
export class ReelAnimator {
  rotation = 0;
  private phase: Phase = 'idle';
  private velocity = 0;
  private elapsed = 0;
  private stopTime = 0;
  private targetIndex = 0;
  private landingRotation = 0;
  private stopStartRotation = 0;
  private stopStartElapsed = 0;
  private lastFace = 0;
  private timing: ReelTiming;

  constructor(private ringLen: number, reducedMotion = false) {
    this.timing = reducedMotion ? REDUCED_TIMING : DEFAULT_TIMING;
    this.lastFace = frontIndex(0, ringLen);
  }

  setReducedMotion(reduced: boolean) {
    this.timing = reduced ? REDUCED_TIMING : DEFAULT_TIMING;
  }

  isSpinning(): boolean {
    return this.phase === 'spinning' || this.phase === 'stopping';
  }

  begin(targetIndex: number, stopTime: number) {
    this.phase = 'spinning';
    this.velocity = 0;
    this.elapsed = 0;
    this.targetIndex = targetIndex;
    this.stopTime = stopTime;
    this.lastFace = frontIndex(this.rotation, this.ringLen);
  }

  tick(delta: number): ReelTickResult {
    const { accel, maxSpeed, decel, minSpins } = this.timing;
    let justStopped = false;
    let clicked = false;

    if (this.phase === 'spinning') {
      this.elapsed += delta;
      this.velocity = this.elapsed < accel ? maxSpeed * (this.elapsed / accel) : maxSpeed;
      this.rotation += this.velocity * delta;

      if (this.elapsed >= this.stopTime - decel) {
        this.landingRotation = solveLandingRotation(
          this.rotation,
          this.targetIndex,
          this.ringLen,
          minSpins,
        );
        this.stopStartRotation = this.rotation;
        this.stopStartElapsed = this.elapsed;
        this.phase = 'stopping';
      }
    } else if (this.phase === 'stopping') {
      this.elapsed += delta;
      const t = Math.min(1, (this.elapsed - this.stopStartElapsed) / decel);
      const eased = easeOutBack(t);
      this.rotation =
        this.stopStartRotation + (this.landingRotation - this.stopStartRotation) * eased;
      this.velocity = maxSpeed * (1 - t);

      const face = frontIndex(this.rotation, this.ringLen);
      if (face !== this.lastFace) {
        clicked = true;
        this.lastFace = face;
      }

      if (t >= 1) {
        this.rotation = this.landingRotation;
        this.velocity = 0;
        this.phase = 'stopped';
        justStopped = true;
      }
    }

    return {
      rotation: this.rotation,
      justStopped,
      clicked,
      speed01: Math.min(1, this.velocity / maxSpeed),
    };
  }

  /** Subtle idle drift so the reel never looks perfectly frozen. */
  idleDrift(delta: number, amount = 0.02) {
    if (this.phase !== 'idle' && this.phase !== 'stopped') return this.rotation;
    this.rotation += delta * amount;
    return this.rotation;
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  get step(): number {
    return TWO_PI / this.ringLen;
  }
}
