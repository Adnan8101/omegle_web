'use client';

import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { FRONT_Z, HUD_Y, MAT } from '../layout';
import { WINDOW_W } from '../Reels/ReelPhysics';

interface CabinetHUDProps {
  balance: number;
  bet: number;
  lastWin: number;
  currencyName: string;
}

const PANEL_W = WINDOW_W + 0.2;
const PANEL_H = 1.15;
const TEX_W = 1024;
const TEX_H = 256;

function drawHud(
  ctx: CanvasRenderingContext2D,
  balance: number,
  bet: number,
  win: number,
  currency: string,
) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  // dark LED backing
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  const cols = [
    { label: 'BALANCE', value: balance, color: '#39d98a', x: TEX_W * 0.19 },
    { label: 'BET', value: bet, color: '#ffd23f', x: TEX_W * 0.5 },
    { label: 'LAST WIN', value: win, color: '#37c6ff', x: TEX_W * 0.81 },
  ];

  ctx.textAlign = 'center';
  for (const c of cols) {
    ctx.textBaseline = 'top';
    ctx.font = `700 ${Math.floor(TEX_H * 0.16)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(c.label, c.x, TEX_H * 0.16);

    ctx.textBaseline = 'middle';
    ctx.font = `800 ${Math.floor(TEX_H * 0.36)}px "Courier New", monospace`;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = c.color;
    ctx.fillText(Math.round(c.value).toLocaleString(), c.x, TEX_H * 0.62);
    ctx.shadowBlur = 0;
  }

  ctx.font = `600 ${Math.floor(TEX_H * 0.11)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.textBaseline = 'bottom';
  ctx.fillText(currency.toUpperCase(), TEX_W * 0.5, TEX_H - 6);
}

/** LED balance / bet / last-win panel set into the lower front of the cabinet, with count-up. */
export default function CabinetHUD({ balance, bet, lastWin, currencyName }: CabinetHUDProps) {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = TEX_W;
    c.height = TEX_H;
    return c;
  }, []);
  const ctx = useMemo(() => canvas.getContext('2d')!, [canvas]);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas]);

  const disp = useRef({ balance, bet, win: lastWin });
  const shown = useRef({ balance: -1, bet: -1, win: -1 });

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 6);
    disp.current.balance += (balance - disp.current.balance) * k;
    disp.current.bet += (bet - disp.current.bet) * k;
    disp.current.win += (lastWin - disp.current.win) * k;

    const rb = Math.round(disp.current.balance);
    const rbet = Math.round(disp.current.bet);
    const rw = Math.round(disp.current.win);
    if (rb !== shown.current.balance || rbet !== shown.current.bet || rw !== shown.current.win) {
      shown.current = { balance: rb, bet: rbet, win: rw };
      drawHud(ctx, rb, rbet, rw, currencyName);
      texture.needsUpdate = true;
    }
  });

  return (
    <group position={[0, HUD_Y, FRONT_Z + 0.03]}>
      {/* recessed bezel */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[PANEL_W + 0.25, PANEL_H + 0.2, 0.12]} />
        <meshStandardMaterial color={MAT.piano} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* LED face */}
      <mesh>
        <planeGeometry args={[PANEL_W, PANEL_H]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
