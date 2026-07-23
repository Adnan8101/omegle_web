// Shared visual tokens for the slot machine cabinet — kept in one place so the
// chrome/gold/glass look stays consistent across the cabinet, lever, window and HUD.

export const METAL = {
  bezel: 'linear-gradient(145deg,#4b5160 0%,#20232b 45%,#0b0c10 70%,#3a3f4b 100%)',
  bezelEdge: '0 0 0 1px rgba(255,255,255,0.08) inset, 0 0 0 3px rgba(0,0,0,0.6) inset',
  brushed:
    'repeating-linear-gradient(100deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)',
  chromeRod: 'linear-gradient(90deg,#7d828d 0%,#e8ecf1 18%,#f7fafc 32%,#aeb4bf 48%,#6a6f79 62%,#c7ccd4 80%,#4c5058 100%)',
  chromeRodVertical:
    'linear-gradient(180deg,#8a8f99 0%,#eef1f5 12%,#ffffff 22%,#c3c8d1 38%,#6a6f79 55%,#dfe3e8 72%,#7d828d 88%,#4c5058 100%)',
};

export const GOLD = {
  ring: 'radial-gradient(circle at 35% 30%,#fff3c4,#f4c430 45%,#a9781f 75%,#5c3f0c 100%)',
  edge: '0 2px 0 rgba(255,241,181,0.5) inset, 0 -2px 4px rgba(0,0,0,0.5) inset',
};

export const RUBY = {
  ball: 'radial-gradient(circle at 32% 26%,#ffb3ad,#f75a52 30%,#c8140b 62%,#5c0300 100%)',
  ballDim: 'radial-gradient(circle at 32% 26%,#7a7d84,#565962 45%,#2a2c31 100%)',
  glow: '0 0 22px rgba(239,68,68,0.65), 0 0 46px rgba(239,68,68,0.28)',
};

export const GLASS = {
  panel: 'linear-gradient(180deg, rgba(8,10,16,0.92), rgba(16,19,28,0.96) 55%, rgba(6,7,11,0.95))',
  innerShadow: 'inset 0 4px 28px rgba(0,0,0,0.85), inset 0 -4px 20px rgba(0,0,0,0.6)',
};

export const NEON = {
  cyan: '#22d3ee',
  magenta: '#e879f9',
  amber: '#fbbf24',
};
