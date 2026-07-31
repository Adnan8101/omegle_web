/** The reward-reveal state machine, in order. `receipt` is the final resting state. */
export type CeremonyPhase = 'focus' | 'drop' | 'anticipate' | 'opening' | 'reveal' | 'receipt';
