'use client';
// Admin: configure the Slot Machine — game status, betting limits, cosmetic
// symbols, outcome probabilities (must total 100%), payout multipliers, and
// spin history. Mirrors the Spin the Wheel admin page conventions (session
// guard, tabs, toggle/number inputs, save banners).

import type { AdminSymbol } from '@/lib/gambling/types';
import { DEFAULT_SLOT_SYMBOLS } from '@/lib/gambling/slots/constants';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiLoader,
  FiPercent,
  FiPlus,
  FiSave,
  FiSettings,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi';

interface SlotConfigState {
  enabled: boolean;
  min_bet: number;
  max_bet: number;
  default_bet: number;
  quick_bets: number[];
  prob_three: number;
  prob_two: number;
  prob_none: number;
  payout_three: number;
  payout_two: number;
  payout_none: number;
}

interface SlotSpinRow {
  spinId: string;
  userName: string;
  bet: number;
  reward: number;
  profit: number;
  outcome: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

const DEFAULT_CONFIG: SlotConfigState = {
  enabled: false,
  min_bet: 10,
  max_bet: 1000,
  default_bet: 50,
  quick_bets: [10, 25, 50, 100],
  prob_three: 15,
  prob_two: 35,
  prob_none: 50,
  payout_three: 3,
  payout_two: 1,
  payout_none: 0,
};

const OUTCOME_LABEL: Record<string, string> = {
  THREE: 'Three Matching',
  TWO: 'Two Matching',
  NONE: 'No Match',
};

export default function AdminSlotsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'betting' | 'symbols' | 'odds' | 'history'>('general');

  const [config, setConfig] = useState<SlotConfigState>(DEFAULT_CONFIG);
  const [symbols, setSymbols] = useState<AdminSymbol[]>([]);

  const [history, setHistory] = useState<SlotSpinRow[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- Access guard + initial load ---
  const load = useCallback(async () => {
    try {
      const accessRes = await fetch('/api/casino/access', { cache: 'no-store' });
      const access = await accessRes.json();
      if (!access.hasAccess) {
        router.replace('/admin');
        return;
      }
      const res = await fetch('/api/gambling/slots/config', { cache: 'no-store' });
      const data = await res.json();
      setConfig({ ...DEFAULT_CONFIG, ...data.config });
      const loaded: AdminSymbol[] = (data.symbols || []).map((s: any, i: number) => ({
        position: i,
        label: s.label || '',
        icon: s.icon ?? null,
        enabled: s.enabled !== false,
      }));
      setSymbols(loaded);
    } catch {
      setError('Failed to load slot machine configuration.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.replace('/admin');
      return;
    }
    load();
  }, [status, load, router]);

  const updateSymbol = (index: number, patch: Partial<AdminSymbol>) => {
    setSymbols((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addSymbol = () => {
    setSymbols((prev) => [...prev, { position: prev.length, label: '', icon: null, enabled: true }]);
  };
  const removeSymbol = (index: number) => {
    setSymbols((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i })));
  };
  const resetDefaultSymbols = () => {
    setSymbols(
      DEFAULT_SLOT_SYMBOLS.map((s, i) => ({ position: i, label: s.label, icon: s.icon, enabled: true })),
    );
  };

  const probTotal = config.prob_three + config.prob_two + config.prob_none;
  const probValid = probTotal === 100;
  const enabledSymbolCount = useMemo(() => symbols.filter((s) => s.enabled).length, [symbols]);

  // Client-side pre-validation mirrors the server; disables Save when invalid.
  const validationError = useMemo(() => {
    if (config.min_bet < 1) return 'Minimum bet must be at least 1.';
    if (config.max_bet < config.min_bet) return 'Maximum bet must be ≥ minimum bet.';
    if (config.default_bet < config.min_bet || config.default_bet > config.max_bet)
      return 'Default bet must be between the minimum and maximum bet.';
    if (!probValid) return `Outcome probabilities must total 100% (currently ${probTotal}%).`;
    if (symbols.length === 0) return 'Add at least one symbol.';
    if (enabledSymbolCount < 1) return 'At least one symbol must be enabled.';
    if (config.prob_two > 0 && enabledSymbolCount < 2)
      return 'Enable at least 2 symbols for the Two-Matching outcome.';
    if (config.prob_none > 0 && enabledSymbolCount < 3)
      return 'Enable at least 3 symbols for the No-Match outcome.';
    return null;
  }, [config, symbols, probValid, probTotal, enabledSymbolCount]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/gambling/slots/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, symbols }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save.');
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [config, symbols]);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/gambling/slots/history?page=${page}`, { cache: 'no-store' });
      const data = await res.json();
      setHistory(data.spins || []);
      setHistoryPage(data.page || 1);
      setHistoryTotalPages(data.totalPages || 1);
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') loadHistory(historyPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'general' as const, label: 'General', icon: <FiSettings className="w-4 h-4" /> },
    { id: 'betting' as const, label: 'Betting', icon: <FiDollarSign className="w-4 h-4" /> },
    { id: 'symbols' as const, label: 'Symbols', icon: <FiPlus className="w-4 h-4" /> },
    { id: 'odds' as const, label: 'Odds & Payouts', icon: <FiPercent className="w-4 h-4" /> },
    { id: 'history' as const, label: 'History', icon: <FiClock className="w-4 h-4" /> },
  ];

  const numInput =
    'w-28 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
            Slot Machine
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">Configure the slot machine game.</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !!validationError}
          title={validationError || ''}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSave className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      {/* Banners */}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-500 text-sm flex items-center gap-2">
          <FiCheckCircle className="w-4 h-4" /> Configuration saved.
        </div>
      )}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          {error}
        </div>
      )}
      {validationError && !error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-sm">
          {validationError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'general' && (
        <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Game Status</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                When disabled, users cannot access the game and see &quot;Game Currently Disabled.&quot;
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
              className={`p-3 rounded-xl transition-all ${
                config.enabled
                  ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                  : 'bg-red-500/20 text-red-500 border border-red-500/30'
              }`}
            >
              {config.enabled ? <FiToggleRight className="w-6 h-6" /> : <FiToggleLeft className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}

      {/* Betting */}
      {activeTab === 'betting' && (
        <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md space-y-6 max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Minimum Bet (OZY)</h3>
            </div>
            <input
              type="number"
              min={1}
              value={config.min_bet}
              onChange={(e) => setConfig((c) => ({ ...c, min_bet: Math.max(1, parseInt(e.target.value) || 1) }))}
              className={numInput}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Maximum Bet (OZY)</h3>
            </div>
            <input
              type="number"
              min={1}
              value={config.max_bet}
              onChange={(e) => setConfig((c) => ({ ...c, max_bet: Math.max(1, parseInt(e.target.value) || 1) }))}
              className={numInput}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Default Bet (OZY)</h3>
            </div>
            <input
              type="number"
              min={1}
              value={config.default_bet}
              onChange={(e) => setConfig((c) => ({ ...c, default_bet: Math.max(1, parseInt(e.target.value) || 1) }))}
              className={numInput}
            />
          </div>
          <div>
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1">Quick Bet Buttons</h3>
            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-3">
              Comma-separated OZY amounts shown as quick-select chips. A &quot;MAX&quot; button is always shown.
            </p>
            <input
              type="text"
              value={config.quick_bets.join(', ')}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  quick_bets: e.target.value
                    .split(',')
                    .map((v) => parseInt(v.trim(), 10))
                    .filter((v) => Number.isInteger(v) && v > 0),
                }))
              }
              placeholder="10, 25, 50, 100"
              className="w-full px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))]"
            />
          </div>
        </div>
      )}

      {/* Symbols */}
      {activeTab === 'symbols' && (
        <div className="space-y-3 max-w-3xl">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
              Symbols are purely cosmetic — they do not affect win rates. Enabled symbols:{' '}
              <span className="font-semibold text-[rgb(var(--color-text-secondary))]">{enabledSymbolCount}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={resetDefaultSymbols}
                className="px-3 py-1.5 rounded-lg bg-[rgb(var(--color-bg-tertiary))] text-sm text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]"
              >
                Reset to defaults
              </button>
              <button
                onClick={addSymbol}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                <FiPlus className="w-4 h-4" /> Add symbol
              </button>
            </div>
          </div>
          <div className="hidden sm:grid grid-cols-[2rem_5rem_1fr_5rem_2.5rem] gap-3 px-2 text-[11px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">
            <span>#</span>
            <span>Icon</span>
            <span>Label</span>
            <span>Enabled</span>
            <span></span>
          </div>
          {symbols.map((sym, i) => (
            <div
              key={i}
              className="grid grid-cols-[2rem_5rem_1fr_5rem_2.5rem] gap-3 items-center glass-blue rounded-2xl p-3 border border-[rgb(var(--color-border))]/60"
            >
              <span className="text-sm font-bold text-[rgb(var(--color-text-tertiary))]">{i + 1}</span>
              <input
                type="text"
                placeholder="🍒"
                value={sym.icon ?? ''}
                maxLength={200}
                onChange={(e) => updateSymbol(i, { icon: e.target.value || null })}
                className="px-2 py-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center text-lg"
              />
              <input
                type="text"
                placeholder="Label"
                value={sym.label}
                maxLength={40}
                onChange={(e) => updateSymbol(i, { label: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-sm"
              />
              <button
                type="button"
                onClick={() => updateSymbol(i, { enabled: !sym.enabled })}
                className={`p-2 rounded-lg transition-all justify-self-start ${
                  sym.enabled
                    ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                    : 'bg-red-500/20 text-red-500 border border-red-500/30'
                }`}
              >
                {sym.enabled ? <FiToggleRight className="w-5 h-5" /> : <FiToggleLeft className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => removeSymbol(i)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 justify-self-center"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Odds & Payouts */}
      {activeTab === 'odds' && (
        <div className="grid lg:grid-cols-2 gap-6 items-start max-w-4xl">
          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md space-y-5">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Outcome Probabilities</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                The chance of each outcome. Must total exactly 100%.
              </p>
            </div>
            {(
              [
                ['prob_three', 'Three Matching'],
                ['prob_two', 'Two Matching'],
                ['prob_none', 'No Match'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-[rgb(var(--color-text-secondary))]">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={config[key]}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))
                    }
                    className="w-20 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                  />
                  <span className="text-sm text-[rgb(var(--color-text-tertiary))]">%</span>
                </div>
              </div>
            ))}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold ${
                probValid
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-red-500/10 text-red-500'
              }`}
            >
              <span>Total</span>
              <span>{probTotal}%{probValid ? '' : ' (must be 100%)'}</span>
            </div>
          </div>

          <div className="glass-blue rounded-3xl p-6 border border-[rgb(var(--color-border))] shadow-apple-md space-y-5">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Payout Multipliers</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">
                Reward = bet × multiplier. (Three = 3× win, Two = 1× refund, No Match = 0.)
              </p>
            </div>
            {(
              [
                ['payout_three', 'Three Matching (×)'],
                ['payout_two', 'Two Matching (×)'],
                ['payout_none', 'No Match (×)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-[rgb(var(--color-text-secondary))]">{label}</span>
                <input
                  type="number"
                  min={0}
                  value={config[key]}
                  onChange={(e) => setConfig((c) => ({ ...c, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-20 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="glass-blue rounded-3xl p-4 sm:p-6 border border-[rgb(var(--color-border))] shadow-apple-md">
          {historyLoading ? (
            <div className="py-12 flex justify-center">
              <FiLoader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-12 text-center text-[rgb(var(--color-text-tertiary))]">No spins yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] border-b border-[rgb(var(--color-border))]">
                      <th className="py-2 pr-4">User</th>
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Outcome</th>
                      <th className="py-2 pr-4 text-right">Bet</th>
                      <th className="py-2 pr-4 text-right">Reward</th>
                      <th className="py-2 pr-4 text-right">Profit</th>
                      <th className="py-2 pr-4 text-right">Prev</th>
                      <th className="py-2 pr-4 text-right">New</th>
                      <th className="py-2">Spin ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.spinId} className="border-b border-[rgb(var(--color-border))]/40">
                        <td className="py-2 pr-4 text-[rgb(var(--color-text-primary))]">{row.userName}</td>
                        <td className="py-2 pr-4 text-[rgb(var(--color-text-tertiary))] whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-[rgb(var(--color-text-secondary))]">
                          {OUTCOME_LABEL[row.outcome] || row.outcome}
                        </td>
                        <td className="py-2 pr-4 text-right text-[rgb(var(--color-text-secondary))]">
                          {row.bet.toLocaleString()}
                        </td>
                        <td className={`py-2 pr-4 text-right font-semibold ${row.reward > 0 ? 'text-green-500' : 'text-[rgb(var(--color-text-tertiary))]'}`}>
                          {row.reward > 0 ? row.reward.toLocaleString() : '—'}
                        </td>
                        <td
                          className={`py-2 pr-4 text-right font-semibold ${
                            row.profit > 0 ? 'text-green-500' : row.profit < 0 ? 'text-red-500' : 'text-[rgb(var(--color-text-tertiary))]'
                          }`}
                        >
                          {row.profit > 0 ? `+${row.profit.toLocaleString()}` : row.profit.toLocaleString()}
                        </td>
                        <td className="py-2 pr-4 text-right text-[rgb(var(--color-text-secondary))]">{row.balanceBefore.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right text-[rgb(var(--color-text-secondary))]">{row.balanceAfter.toLocaleString()}</td>
                        <td className="py-2 font-mono text-xs text-[rgb(var(--color-text-tertiary))]">{row.spinId.slice(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => loadHistory(historyPage - 1)}
                  className="px-3 py-1.5 rounded-lg bg-[rgb(var(--color-bg-tertiary))] text-sm disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-[rgb(var(--color-text-tertiary))]">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <button
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => loadHistory(historyPage + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[rgb(var(--color-bg-tertiary))] text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
