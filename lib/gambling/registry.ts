

export interface GamblingGameEntry {
  key: string;
  name: string;
  tagline: string;
  icon: string; 
  href: string; 
  stateUrl: string; 
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
