// Shared world-space layout for the cabinet, aligned to the reel window (centered at origin,
// reel front faces at z = REEL_RADIUS ≈ 2.4). All cabinet pieces reference these so the body
// reads as one connected object.

export const FRONT_Z = 2.52; // outer face of the front bezel
export const GLASS_Z = 2.66; // glass pane, just proud of the bezel
export const BEZEL_DEPTH = 0.5;

export const CAB_W = 8; // overall cabinet width
export const BODY_TOP = 2.15; // top of the reel-section front panel
export const BODY_BOTTOM = -3.9; // bottom of the front panel (control deck area)
export const BACK_Z = -2.9; // back wall

export const MARQUEE_Y = 3.25;
export const MARQUEE_W = 7.2;
export const MARQUEE_H = 2.0;

export const BASE_Y = -4.35;
export const BASE_W = 8.6;
export const BASE_H = 1.1;

export const HUD_Y = -2.55; // LED HUD strip on the lower front panel

// Material palette (hex). Each surface uses distinct metalness/roughness so it reacts to light
// differently: brushed aluminum, chrome, gold, black piano finish, matte rubber.
export const MAT = {
  aluminum: '#b9c0c9',
  aluminumDark: '#8b929c',
  chrome: '#e8ecf2',
  gold: '#f5c542',
  goldDeep: '#c9971f',
  piano: '#0c0d12',
  rubber: '#1a1c22',
  glassTint: '#0a1830',
  ruby: '#e01e3c',
};
