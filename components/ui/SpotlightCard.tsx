'use client';

import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { hexToRgbTriplet } from '@/lib/color';

interface SpotlightCardProps {
  children: ReactNode;
  /** Hex accent driving the glow — typically a Discord profile accent colour. */
  accent?: string | null;
  className?: string;
  style?: CSSProperties;
  /** Adds a cursor-following highlight along the border. */
  edge?: boolean;
}

/**
 * A surface that lights up under the pointer.
 *
 * Pointer position is written straight to the node as CSS custom properties
 * inside a single rAF per frame — it never touches React state, so moving the
 * cursor across a grid of these costs zero renders and zero reconciliation.
 * The paint itself is a composited radial-gradient (see `.fx-spotlight`).
 *
 * Purely presentational: it renders a plain element so callers stay free to
 * put whatever content they need inside, including headings. For a fully
 * clickable card, overlay a stretched button/link on top of the content.
 */
export default function SpotlightCard({
  children,
  accent,
  className = '',
  style,
  edge = true,
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const reduce = useReducedMotion();

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (frame.current) return; // coalesce: at most one write per frame
    const { clientX, clientY } = event;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty('--fx-mx', `${clientX - rect.left}px`);
      node.style.setProperty('--fx-my', `${clientY - rect.top}px`);
    });
  }, []);

  // Park the highlight back at top-centre so the next hover eases in from a
  // neutral position rather than snapping from wherever the cursor left.
  const handlePointerLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty('--fx-mx', '50%');
    node.style.setProperty('--fx-my', '0%');
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const pointerProps = reduce
    ? {}
    : { onPointerMove: handlePointerMove, onPointerLeave: handlePointerLeave };

  const classes = ['fx-surface', 'fx-spotlight', edge && 'fx-edge', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={ref}
      className={classes}
      style={{ '--fx-accent-rgb': hexToRgbTriplet(accent), ...style } as CSSProperties}
      {...pointerProps}
    >
      {children}
    </div>
  );
}
