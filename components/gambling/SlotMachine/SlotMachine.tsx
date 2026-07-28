'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { PublicSymbol } from '@/lib/gambling/types';
import { renderEmoji } from '@/lib/gambling/renderEmoji';
import Reel2D, { type Reel2DHandle } from './Reel2D';

export interface SlotMachineHandle {
  spinTo: (reels: PublicSymbol[], result?: { reward: number; big: boolean }) => Promise<void>;
}

interface SlotMachineProps {
  symbols: PublicSymbol[];
  canSpin?: boolean;
  spinning?: boolean;
  reducedMotion?: boolean;
  balance: number;
  bet: number;
  lastWin: number;
  currencyName: string;
  /** called when the SPIN button fires the spin request */
  onSpinClick?: () => void;
  /** called each time a reel comes to rest (host plays the stop sound) */
  onReelStop?: () => void;
  enableBloom?: boolean;
}

const REEL_COUNT = 3;
// later reels stop last → left-to-right cascade with rising anticipation
const LAND_DURATION = [1650, 2050, 2500];
const LAND_SPINS = [5, 6, 7];
const REDUCED_DURATION = [260, 340, 420];

const fmt = (n: number) => Math.max(0, Math.round(n)).toLocaleString();

/**
 * A fully 2D, DOM/CSS slot machine — premium cabinet, marquee, LED credit displays, three spinning
 * reels on a single center payline, and a big illuminated SPIN button. Exposes the same imperative
 * `spinTo` handle the host page already drives, so no API/wallet logic lives here.
 */
const SlotMachine = forwardRef<SlotMachineHandle, SlotMachineProps>(function SlotMachine(
  { symbols, canSpin = false, spinning = false, reducedMotion = false, balance, bet, lastWin, currencyName, onSpinClick, onReelStop },
  ref,
) {
  const reelRefs = useRef<(Reel2DHandle | null)[]>([]);
  const [winPulse, setWinPulse] = useState<'none' | 'win' | 'big'>('none');
  const [pressed, setPressed] = useState(false);
  const startedRef = useRef(false);

  const pool = useMemo(() => (symbols.length ? symbols : [{ label: '?', icon: '❔' }]), [symbols]);

  // instant reel feedback: the moment the host flips `spinning` on, the reels start cruising —
  // they keep spinning through the network round-trip until spinTo() lands them.
  useEffect(() => {
    if (spinning && !startedRef.current) {
      startedRef.current = true;
      setWinPulse('none');
      reelRefs.current.forEach((r) => r?.startSpin());
    }
    if (!spinning) startedRef.current = false;
  }, [spinning]);

  useImperativeHandle(
    ref,
    () => ({
      spinTo: async (reels, result) => {
        const dur = reducedMotion ? REDUCED_DURATION : LAND_DURATION;
        await Promise.all(
          reelRefs.current.map((r, i) => {
            const target = reels[i] ?? reels[reels.length - 1] ?? pool[0];
            return r
              ? r.land(target, dur[i] ?? dur[dur.length - 1], LAND_SPINS[i] ?? 6).then(() => onReelStop?.())
              : Promise.resolve();
          }),
        );
        if (result && result.reward > 0) {
          setWinPulse(result.big ? 'big' : 'win');
        } else {
          setWinPulse('none');
        }
      },
    }),
    [pool, reducedMotion, onReelStop],
  );

  const handleSpin = () => {
    if (!canSpin || spinning) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 180);
    onSpinClick?.();
  };

  return (
    <div className="slot2d-root">
      {/* ── Marquee / top crown ─────────────────────────── */}
      <div className="slot2d-marquee">
        <div className="slot2d-marquee-lights" aria-hidden>
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className="slot2d-bulb" style={{ animationDelay: `${(i % 7) * 0.14}s` }} />
          ))}
        </div>
        <div className="slot2d-marquee-title">
          <span className="slot2d-marquee-star">✦</span>
          MEGA SLOTS
          <span className="slot2d-marquee-star">✦</span>
        </div>
      </div>

      {/* ── Cabinet body ────────────────────────────────── */}
      <div className="slot2d-cabinet">
        {/* HUD: credits / bet / win */}
        <div className="slot2d-hud">
          <div className="slot2d-pod">
            <span className="slot2d-pod-label">Credits</span>
            <span className="slot2d-pod-value">{fmt(balance)}</span>
          </div>
          <div className="slot2d-pod slot2d-pod--bet">
            <span className="slot2d-pod-label">Bet</span>
            <span className="slot2d-pod-value">{fmt(bet)}</span>
          </div>
          <div className={`slot2d-pod slot2d-pod--win ${lastWin > 0 ? 'is-hot' : ''}`}>
            <span className="slot2d-pod-label">Win</span>
            <span className="slot2d-pod-value">{fmt(lastWin)}</span>
          </div>
        </div>

        {/* Reel bay */}
        <div className={`slot2d-bay ${spinning ? 'is-spinning' : ''} ${winPulse !== 'none' ? `is-${winPulse}` : ''}`}>
          <div className="slot2d-reels">
            {Array.from({ length: REEL_COUNT }).map((_, i) => (
              <Reel2D
                key={i}
                ref={(el) => {
                  reelRefs.current[i] = el;
                }}
                pool={pool}
                cruiseSpeed={24 + i * 3}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
          {/* single-line payline marker + glass */}
          <div className="slot2d-payline" aria-hidden />
          <div className="slot2d-glass" aria-hidden />
          <div className="slot2d-bay-glow" aria-hidden />
        </div>

        {/* Control deck */}
        <div className="slot2d-deck">
          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin || spinning}
            className={`slot2d-spin ${pressed ? 'is-pressed' : ''} ${spinning ? 'is-spinning' : ''}`}
            aria-label="Spin the reels"
          >
            <span className="slot2d-spin-ring" aria-hidden />
            <span className="slot2d-spin-face">
              {spinning ? (
                <span className="slot2d-spin-dots" aria-hidden>
                  <i /><i /><i />
                </span>
              ) : (
                'SPIN'
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Payout legend */}
      <div className="slot2d-legend">
        <span className="slot2d-legend-title">Match 3 on the line</span>
        <div className="slot2d-legend-row">
          {pool.slice(0, 6).map((s, i) => (
            <span key={i} className="slot2d-legend-chip">
              {s.icon ? renderEmoji(s.icon, 'slot2d-legend-img') : s.label.slice(0, 2)}
            </span>
          ))}
        </div>
        <span className="slot2d-legend-note">Win in {currencyName}</span>
      </div>
    </div>
  );
});

export default SlotMachine;
