'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate, type AnimationPlaybackControls } from 'framer-motion';
import { GOLD, RUBY, METAL } from './theme';

interface SlotLeverProps {
  canSpin: boolean;
  onPull: () => void;
  onSettle?: () => void;
  tileH: number;
  reducedMotion?: boolean;
}

export default function SlotLever({ canSpin, onPull, onSettle, tileH, reducedMotion = false }: SlotLeverProps) {
  const rotate = useMotionValue(0);
  const [grabbing, setGrabbing] = useState(false);
  const pullingRef = useRef(false);
  const idleControls = useRef<AnimationPlaybackControls | null>(null);

  const RAIL_H = Math.round(tileH * 3.35);
  const ROD_H = Math.round(RAIL_H * 0.82);
  const ROD_W = Math.max(7, Math.round(tileH * 0.1));
  const BALL = Math.round(tileH * 0.62);
  const MOUNT_W = Math.round(tileH * 0.5);

  const startIdleSway = () => {
    if (reducedMotion) return;
    idleControls.current?.stop();
    idleControls.current = animate(rotate, [-2.2, 2.2, -2.2], {
      duration: 4.2,
      repeat: Infinity,
      ease: 'easeInOut',
    });
  };

  useEffect(() => {
    if (canSpin && !pullingRef.current) startIdleSway();
    if (!canSpin) idleControls.current?.stop();
    return () => {
      idleControls.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSpin, reducedMotion]);

  const pull = async () => {
    if (!canSpin || pullingRef.current) return;
    pullingRef.current = true;
    idleControls.current?.stop();
    setGrabbing(true);

    if (reducedMotion) {
      onPull();
      pullingRef.current = false;
      setGrabbing(false);
      return;
    }

    // Timeline: 0ms start -> 200ms accelerate -> 350ms hit bottom -> 420ms bounce -> 700ms settled return.
    const seq = animate(
      rotate,
      [0, 58, 66, 60, 0],
      {
        duration: 0.7,
        times: [0, 200 / 700, 350 / 700, 420 / 700, 1],
        ease: ['easeIn', 'easeOut', 'easeOut', 'easeInOut'],
      },
    );

    const fireTimer = setTimeout(onPull, 330);
    await seq;
    clearTimeout(fireTimer);

    setGrabbing(false);
    pullingRef.current = false;
    onSettle?.();
    if (canSpin) startIdleSway();
  };

  return (
    <div
      className="relative flex-shrink-0 select-none"
      style={{ width: BALL + MOUNT_W * 0.6, height: RAIL_H + BALL / 2 }}
      aria-label="Slot machine lever"
      role="button"
    >
      {/* Mount bracket fixed into the cabinet wall */}
      <div
        className="absolute left-0 rounded-l-full"
        style={{
          bottom: 6,
          width: MOUNT_W,
          height: Math.round(tileH * 0.22),
          background: METAL.chromeRod,
          boxShadow: '0 3px 10px rgba(0,0,0,0.55), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.4)',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          left: MOUNT_W * 0.35,
          bottom: 2,
          width: Math.round(tileH * 0.34),
          height: Math.round(tileH * 0.34),
          background: GOLD.ring,
          boxShadow: GOLD.edge + ', 0 4px 10px rgba(0,0,0,0.5)',
        }}
      />

      {/* Rod + ball, rotating about the bottom pivot */}
      <motion.div
        className="absolute origin-bottom"
        style={{
          left: MOUNT_W * 0.35 + Math.round(tileH * 0.17) - ROD_W / 2,
          bottom: Math.round(tileH * 0.17) + 2,
          width: ROD_W,
          height: ROD_H,
          rotate,
          borderRadius: ROD_W,
          background: METAL.chromeRodVertical,
          boxShadow: '2px 0 6px rgba(0,0,0,0.45), inset -1px 0 2px rgba(255,255,255,0.4), inset 1px 0 2px rgba(0,0,0,0.35)',
        }}
      >
        {/* Gold connector collar just below the ball */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            top: -Math.round(BALL * 0.16),
            width: ROD_W * 2.1,
            height: Math.round(BALL * 0.22),
            background: GOLD.ring,
            boxShadow: GOLD.edge,
            zIndex: 2,
          }}
        />
        {/* Ball */}
        <div
          onPointerDown={() => canSpin && setGrabbing(true)}
          onPointerUp={pull}
          onPointerLeave={() => !pullingRef.current && setGrabbing(false)}
          className={`absolute left-1/2 -translate-x-1/2 rounded-full transition-transform duration-150 ${
            canSpin ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed'
          } ${grabbing ? 'scale-95' : 'hover:scale-105'}`}
          style={{
            top: -Math.round(BALL * 0.62),
            width: BALL,
            height: BALL,
            background: canSpin ? RUBY.ball : RUBY.ballDim,
            boxShadow: canSpin
              ? `${RUBY.glow}, inset 0 3px 6px rgba(255,255,255,0.45), inset 0 -6px 10px rgba(0,0,0,0.45)`
              : 'inset 0 3px 6px rgba(255,255,255,0.15), inset 0 -6px 10px rgba(0,0,0,0.4)',
            zIndex: 3,
          }}
        >
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: BALL * 0.32,
              height: BALL * 0.22,
              top: '18%',
              left: '20%',
              background: 'rgba(255,255,255,0.55)',
              filter: 'blur(1px)',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}
