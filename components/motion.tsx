'use client';

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

/** Shared "expo-out" easing used across the whole site's motion system. */
const EASE = [0.22, 1, 0.36, 1] as const;
/** Softer, slower easing for large hero-scale movement. */
const EASE_SOFT = [0.16, 1, 0.3, 1] as const;

type Dir = 'up' | 'down' | 'left' | 'right' | 'none';
function offset(dir: Dir, d: number): { x?: number; y?: number } {
  switch (dir) {
    case 'up':
      return { y: d };
    case 'down':
      return { y: -d };
    case 'left':
      return { x: d };
    case 'right':
      return { x: -d };
    default:
      return {};
  }
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** entrance direction the element travels FROM */
  dir?: Dir;
  distance?: number;
  delay?: number;
  duration?: number;
  blur?: boolean;
  /** entrance scale, e.g. 0.94 grows subtly into place */
  scale?: number;
  once?: boolean;
  /** play on mount instead of on scroll-into-view (use for above-the-fold hero content) */
  mount?: boolean;
}

/**
 * Scroll-reveal (or mount-reveal) wrapper. Fades + translates its children into place with an
 * optional soft blur and scale. Respects `prefers-reduced-motion`.
 * GPU-only (opacity/transform/filter).
 */
export function Reveal({
  children,
  className,
  style,
  dir = 'up',
  distance = 26,
  delay = 0,
  duration = 0.65,
  blur = false,
  scale,
  once = true,
  mount = false,
}: RevealProps) {
  const reduce = useReducedMotion();
  const from = reduce
    ? false
    : {
        opacity: 0,
        ...offset(dir, distance),
        ...(blur ? { filter: 'blur(12px)' } : {}),
        ...(scale ? { scale } : {}),
      };
  const to = {
    opacity: 1,
    x: 0,
    y: 0,
    ...(blur ? { filter: 'blur(0px)' } : {}),
    ...(scale ? { scale: 1 } : {}),
  };

  const trigger = mount
    ? { animate: to }
    : { whileInView: to, viewport: { once, margin: '-70px' } as const };

  return (
    <motion.div className={className} style={style} initial={from} {...trigger} transition={{ duration, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

interface RevealGroupProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  stagger?: number;
  delay?: number;
  once?: boolean;
  mount?: boolean;
}

/** Staggered container — reveals its <Item> children one after another. */
export function RevealGroup({
  children,
  className,
  style,
  stagger = 0.09,
  delay = 0,
  once = true,
  mount = false,
}: RevealGroupProps) {
  const reduce = useReducedMotion();
  const trigger = mount
    ? { animate: 'show' as const }
    : { whileInView: 'show' as const, viewport: { once, margin: '-70px' } as const };
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      {...trigger}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child. Must live inside a <RevealGroup>. */
export function Item({
  children,
  className,
  style,
  dir = 'up',
  distance = 22,
  blur = false,
  scale,
  duration = 0.55,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  dir?: Dir;
  distance?: number;
  blur?: boolean;
  scale?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const variants: Variants = {
    hidden: reduce
      ? {}
      : {
          opacity: 0,
          ...offset(dir, distance),
          ...(blur ? { filter: 'blur(10px)' } : {}),
          ...(scale ? { scale } : {}),
        },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      ...(blur ? { filter: 'blur(0px)' } : {}),
      ...(scale ? { scale: 1 } : {}),
      transition: { duration, ease: EASE },
    },
  };
  return (
    <motion.div className={className} style={style} variants={variants}>
      {children}
    </motion.div>
  );
}

/**
 * Per-word headline reveal — each word rises out of a soft blur, one after the next.
 * Words stay individually inline-block so the headline still wraps naturally.
 */
export function Words({
  text,
  className,
  style,
  delay = 0,
  stagger = 0.055,
  distance = 18,
  duration = 0.7,
  blur = true,
  mount = false,
  once = true,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  stagger?: number;
  distance?: number;
  duration?: number;
  blur?: boolean;
  mount?: boolean;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  const trigger = mount
    ? { animate: 'show' as const }
    : { whileInView: 'show' as const, viewport: { once, margin: '-60px' } as const };

  return (
    <motion.span
      className={className}
      style={style}
      initial="hidden"
      {...trigger}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
          variants={{
            hidden: reduce
              ? {}
              : { opacity: 0, y: distance, ...(blur ? { filter: 'blur(8px)' } : {}) },
            show: {
              opacity: 1,
              y: 0,
              ...(blur ? { filter: 'blur(0px)' } : {}),
              transition: { duration, ease: EASE_SOFT },
            },
          }}
        >
          {w}
        </motion.span>
      )).reduce<ReactNode[]>((acc, node, i) => {
        // keep a real, breakable space between words so long headlines still wrap
        if (i > 0) acc.push(' ');
        acc.push(node);
        return acc;
      }, [])}
    </motion.span>
  );
}

/**
 * Counts from 0 → value the first time it scrolls into view. Use ONLY for real figures.
 */
export function CountUp({
  value,
  className,
  duration = 1.3,
  prefix = '',
  suffix = '',
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  value: number;
  className?: string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let startTs = 0;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min(1, (ts - startTs) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduce, duration]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {format(display)}
      {suffix}
    </span>
  );
}

/**
 * Subtle scroll parallax — translates children vertically as the element passes through view.
 * `speed` is the fraction of its own travel; keep it small (0.06–0.2) for elegance.
 */
export function Parallax({
  children,
  className,
  speed = 0.12,
}: {
  children: ReactNode;
  className?: string;
  speed?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`]);
  return (
    <motion.div ref={ref} className={className} style={reduce ? undefined : { y }}>
      {children}
    </motion.div>
  );
}

/**
 * Pixel-precise, spring-smoothed scroll parallax. Travels from +distance to -distance as the
 * element crosses the viewport. Use small values for foreground content, larger for
 * decorative/background layers.
 */
export function ScrollParallax({
  children,
  className,
  style,
  distance = 60,
  stiffness = 120,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  distance?: number;
  stiffness?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness, damping: 30, mass: 0.3 });
  return (
    <motion.div ref={ref} className={className} style={reduce ? style : { ...style, y }}>
      {children}
    </motion.div>
  );
}

/**
 * Reveals in, then floats forever. Built for ambient decorative objects — keeps `rotate` inside
 * framer's transform so it never fights an inline CSS `transform`.
 */
export function FloatIn({
  children,
  className,
  style,
  rotate = 0,
  opacity = 1,
  amplitude = 9,
  duration = 7,
  delay = 0,
  scaleFrom = 0.92,
  mount = true,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  rotate?: number;
  /** resting opacity once revealed */
  opacity?: number;
  amplitude?: number;
  duration?: number;
  delay?: number;
  scaleFrom?: number;
  mount?: boolean;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} style={{ ...style, opacity, transform: `rotate(${rotate}deg)` }}>
        {children}
      </div>
    );
  }

  const to = {
    opacity,
    scale: 1,
    rotate,
    y: [0, -amplitude, 0],
  };

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, scale: scaleFrom, rotate }}
      {...(mount
        ? { animate: to }
        : { whileInView: to, viewport: { once: true, margin: '-60px' } as const })}
      transition={{
        opacity: { duration: 0.9, delay, ease: EASE },
        scale: { duration: 0.9, delay, ease: EASE },
        y: { duration, delay, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Magnetic pointer-follow wrapper for buttons/CTAs. The child drifts toward the cursor and
 * springs back on leave, with a scale press for click feedback.
 */
export function Magnetic({
  children,
  className,
  style,
  strength = 0.3,
  max = 12,
  hoverScale = 1.04,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  strength?: number;
  max?: number;
  hoverScale?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(my, { stiffness: 220, damping: 18, mass: 0.4 });

  const clamp = (v: number) => Math.max(-max, Math.min(max, v));

  const onMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      mx.set(clamp((e.clientX - (r.left + r.width / 2)) * strength));
      my.set(clamp((e.clientY - (r.top + r.height / 2)) * strength));
    },
    // clamp is derived from `max`, which is stable per render
    [mx, my, strength, max] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const reset = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);

  if (reduce) {
    return (
      <div className={className} style={{ display: 'inline-flex', ...style }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ display: 'inline-flex', x, y, ...style }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 3D pointer tilt for cards. Perspective lives on this wrapper and the rotation on the inner
 * layer, so the card's own 3D children keep their local transform context.
 */
export function Tilt({
  children,
  className,
  style,
  max = 7,
  scale = 1.02,
  perspective = 1000,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  max?: number;
  scale?: number;
  perspective?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rotateX = useSpring(rx, { stiffness: 180, damping: 20, mass: 0.4 });
  const rotateY = useSpring(ry, { stiffness: 180, damping: 20, mass: 0.4 });

  const onMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry.set(px * max * 2);
      rx.set(-py * max * 2);
    },
    [rx, ry, max]
  );

  const reset = useCallback(() => {
    rx.set(0);
    ry.set(0);
  }, [rx, ry]);

  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} style={{ perspective, ...style }} onPointerMove={onMove} onPointerLeave={reset}>
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        whileHover={{ scale }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Spring lift + press feedback for cards and tiles. */
export function HoverLift({
  children,
  className,
  style,
  lift = -6,
  scale = 1.02,
  tapScale = 0.98,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  lift?: number;
  scale?: number;
  tapScale?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={{ y: lift, scale }}
      whileTap={{ scale: tapScale }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

/** Hairline reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.2 });
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        transformOrigin: '0% 50%',
        scaleX,
        background: 'linear-gradient(90deg, #3B9EFF, #7C6AF5 55%, #FF8C00)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    />
  );
}
