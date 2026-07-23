'use client';

import { renderEmoji } from '@/lib/gambling/renderEmoji';

interface CabinetControlsProps {
  bet: number;
  minBet: number;
  maxBet: number;
  balance: number;
  quickBets: number[];
  spinning: boolean;
  canSpin: boolean;
  statusText: string;
  currencyEmoji: string;
  onBetChange: (next: number) => void;
  clampBet: (n: number) => number;
}

/**
 * The control deck built into the base of the machine — reads as a physical coin tray with a
 * gold rim. Bet stepper, quick-bet chips and MAX. Betting/clamp logic stays in the host page.
 */
export default function CabinetControls({
  bet,
  minBet,
  maxBet,
  balance,
  quickBets,
  spinning,
  canSpin,
  statusText,
  currencyEmoji,
  onBetChange,
  clampBet,
}: CabinetControlsProps) {
  const step = minBet || 1;

  return (
    <div
      className="w-full max-w-[540px] mx-auto -mt-3 rounded-b-[26px] rounded-t-lg px-5 pt-5 pb-6 relative"
      style={{
        background: 'linear-gradient(180deg,#20242c 0%,#12151b 60%,#0a0c11 100%)',
        boxShadow:
          'inset 0 2px 3px rgba(255,255,255,0.08), inset 0 -6px 14px rgba(0,0,0,0.6), 0 18px 40px rgba(0,0,0,0.45)',
        border: '1px solid rgba(0,0,0,0.6)',
        borderTop: '2px solid rgba(245,197,66,0.55)',
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => onBetChange(clampBet(bet - step))}
          disabled={spinning}
          aria-label="Decrease bet"
          className="w-12 h-12 shrink-0 rounded-xl text-2xl font-bold text-white/90 disabled:opacity-40 transition-transform active:scale-95"
          style={{ background: 'linear-gradient(180deg,#2c313b,#171a21)', boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)' }}
        >
          −
        </button>

        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {renderEmoji(currencyEmoji, 'w-5 h-5 inline-block align-middle')}
          </div>
          <input
            type="number"
            value={bet}
            min={minBet}
            max={maxBet}
            disabled={spinning}
            onChange={(e) => onBetChange(Math.max(0, parseInt(e.target.value) || 0))}
            onBlur={() => onBetChange(bet > 0 ? clampBet(bet) : bet)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-center text-xl font-extrabold text-amber-300 outline-none"
            style={{
              background: '#05070c',
              border: '1px solid rgba(245,197,66,0.3)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)',
              fontFamily: '"Courier New", monospace',
            }}
          />
        </div>

        <button
          onClick={() => onBetChange(clampBet(bet + step))}
          disabled={spinning}
          aria-label="Increase bet"
          className="w-12 h-12 shrink-0 rounded-xl text-2xl font-bold text-white/90 disabled:opacity-40 transition-transform active:scale-95"
          style={{ background: 'linear-gradient(180deg,#2c313b,#171a21)', boxShadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)' }}
        >
          +
        </button>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-3">
        {quickBets.map((q) => (
          <button
            key={q}
            onClick={() => onBetChange(clampBet(q))}
            disabled={spinning}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white/70 hover:text-white disabled:opacity-40 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {q.toLocaleString()}
          </button>
        ))}
        <button
          onClick={() => onBetChange(clampBet(Math.min(balance, maxBet)))}
          disabled={spinning}
          className="px-4 py-1.5 rounded-lg text-sm font-extrabold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
          style={{ background: 'rgba(245,197,66,0.12)', border: '1px solid rgba(245,197,66,0.35)' }}
        >
          MAX
        </button>
      </div>

      <p
        className={`text-center text-xs font-semibold tracking-wide mt-3 ${
          spinning ? 'text-amber-300/80' : canSpin ? 'text-emerald-300/80' : 'text-white/45'
        }`}
      >
        {statusText}
      </p>
    </div>
  );
}
