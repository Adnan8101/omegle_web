// Coordination bridge between the DOM wrapper (SlotMachine.tsx) and the R3F scene.
// A single mutable instance is created in the wrapper and passed into <SlotScene>.
// Scene components read `mode` / `plans` inside useFrame (no React re-renders) and call
// back through the notify* methods. spinTo() returns a Promise the page awaits before
// updating the wallet — so the backend result is only revealed once animation finishes.

export type SlotMode = 'idle' | 'spin' | 'win';

export interface ReelPlan {
  /** ring index this reel must land on so the payline shows the server-chosen symbol */
  targetIndex: number;
  /** seconds from spin start until this reel is fully stopped */
  stopTime: number;
}

type ModeListener = (mode: SlotMode) => void;

export class SlotController {
  mode: SlotMode = 'idle';
  reducedMotion = false;
  bigWin = false;

  /** increments each spin; animators reset when they see a new value */
  spinId = 0;
  /** per-reel plan for the current spin (empty when idle) */
  plans: ReelPlan[] = [];

  /** increments to fire the win-line sweep */
  winLineToken = 0;
  /** increments to fire a coin burst; magnitude flag on bigBurst */
  burstToken = 0;
  bigBurst = false;
  /** shake request consumed by the scene */
  shakeToken = 0;
  shakeMag = 0;

  private modeListeners = new Set<ModeListener>();
  private resolveSpin: (() => void) | null = null;
  private stoppedCount = 0;
  private reelCount = 3;

  // Audio + effect hooks wired by the scene / wrapper.
  onReelStop?: () => void;
  onReelClick?: () => void;
  onLeverImpact?: () => void;
  onCelebrate?: (big: boolean) => void;

  setMode(mode: SlotMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.modeListeners.forEach((l) => l(mode));
  }

  subscribeMode(l: ModeListener): () => void {
    this.modeListeners.add(l);
    l(this.mode);
    return () => this.modeListeners.delete(l);
  }

  /** Kick off a spin. Resolves when every reel has settled. */
  beginSpin(plans: ReelPlan[], bigWin: boolean): Promise<void> {
    this.plans = plans;
    this.reelCount = plans.length;
    this.bigWin = bigWin;
    this.stoppedCount = 0;
    this.spinId += 1;
    this.setMode('spin');
    return new Promise<void>((resolve) => {
      this.resolveSpin = resolve;
    });
  }

  /** Called by a reel animator once it has fully settled. */
  notifyReelStopped() {
    this.stoppedCount += 1;
    this.onReelStop?.();
    if (this.stoppedCount >= this.reelCount) {
      if (this.plans.length && this.bigWin) this.setMode('win');
      else this.setMode(this.mode === 'spin' ? 'idle' : this.mode);
      const resolve = this.resolveSpin;
      this.resolveSpin = null;
      // Let the caller settle the wallet; celebration visuals are driven separately.
      resolve?.();
    }
  }

  /** Fire the laser win-line sweep across the payline. */
  showWinLine() {
    this.winLineToken += 1;
  }

  /** Raise the win celebration (mode → win, coin burst, optional shake). */
  celebrate(big: boolean) {
    this.setMode('win');
    this.bigBurst = big;
    this.burstToken += 1;
    if (big) this.requestShake(0.35, 0.55);
    this.onCelebrate?.(big);
  }

  requestShake(mag: number, _dur: number) {
    this.shakeMag = mag;
    this.shakeToken += 1;
  }

  reset() {
    this.setMode('idle');
    this.plans = [];
    this.resolveSpin = null;
    this.stoppedCount = 0;
  }
}
