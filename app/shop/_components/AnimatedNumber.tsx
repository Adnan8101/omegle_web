'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Rolls from the previous value to the next one whenever it changes — so a
 * balance visibly *spends* after a purchase instead of blinking to a new
 * figure. First paint is instant (no count-up from zero on load).
 */
export default function AnimatedNumber({
  value,
  className,
  duration = 900,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      from.current = value;
      setDisplay(value);
      return;
    }
    if (reduce || from.current === value) {
      from.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;
    let raf = 0;

    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(origin + delta * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce, duration]);

  return <span className={`sx-num ${className ?? ''}`}>{Math.round(display).toLocaleString()}</span>;
}
