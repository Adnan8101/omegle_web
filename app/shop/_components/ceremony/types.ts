/**
 * The reward-reveal state machine, in order. `receipt` is the final resting
 * state; every phase before it is one beat of the cinematic:
 *
 *   focus      → the shop dims, the stage lights up
 *   fall       → the crate drops out of the sky, trailing light
 *   impact     → it lands — shockwave, dust, camera kick
 *   anticipate → it sits there, seams glowing, daring you to wait
 *   opening    → the lid pops and light floods out
 *   emerge     → the item rises out of the crate on a beam of light
 *   reveal     → it settles into place; name, price, confetti
 */
export type CeremonyPhase =
  | 'focus'
  | 'fall'
  | 'impact'
  | 'anticipate'
  | 'opening'
  | 'emerge'
  | 'reveal'
  | 'receipt';
