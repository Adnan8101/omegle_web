import * as THREE from 'three';

/** A rounded-rectangle Shape centered on the origin. */
export function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);
  s.moveTo(x + radius, y);
  s.lineTo(x + w - radius, y);
  s.quadraticCurveTo(x + w, y, x + w, y + radius);
  s.lineTo(x + w, y + h - radius);
  s.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  s.lineTo(x + radius, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  return s;
}

/** A rounded-rect hole path (centered) suitable for `shape.holes.push(...)`. */
export function roundedRectHole(w: number, h: number, r: number): THREE.Path {
  const p = new THREE.Path();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);
  p.moveTo(x + radius, y);
  p.lineTo(x + w - radius, y);
  p.quadraticCurveTo(x + w, y, x + w, y + radius);
  p.lineTo(x + w, y + h - radius);
  p.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  p.lineTo(x + radius, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - radius);
  p.lineTo(x, y + radius);
  p.quadraticCurveTo(x, y, x + radius, y);
  return p;
}
