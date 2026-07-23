// Client-safe registry of gambling games shown in the lobby (app/gambling).
// Adding a future game (Blackjack, Roulette, …) only requires appending an
// entry here plus its own routes/admin page — the lobby renders dynamically
// from this list and never needs to change.

export interface GamblingGameEntry {
  key: string;
  name: string;
  tagline: string;
  icon: string; // emoji shown on the card
  href: string; // player-facing route
  stateUrl: string; // GET endpoint returning { enabled, devBypass, ... }
}

export const GAMBLING_GAMES: GamblingGameEntry[] = [
  {
    key: 'wheel',
    name: 'Spin the Wheel',
    tagline: 'Buy a spin and chase the jackpot segment.',
    icon: '🎡',
    href: '/wheel',
    stateUrl: '/api/gambling/wheel/state',
  },
  {
    key: 'slots',
    name: 'Slot Machine',
    tagline: 'Bet OZY and match three symbols for the big win.',
    icon: '🎰',
    href: '/slots',
    stateUrl: '/api/gambling/slots/state',
  },
];
