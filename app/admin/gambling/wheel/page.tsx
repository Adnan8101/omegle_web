'use client';
// Admin: configure Spin the Wheel — game settings, segments (reward/odds/color/
// label), a live preview, and spin history. Cloned from the economy config page
// conventions (session guard, tabs, toggle/number inputs, save banners).

import SpinWheel from '@/components/gambling/SpinWheel';
import { DEFAULT_SEGMENT_COLORS, SEGMENT_COUNT_OPTIONS } from '@/lib/gambling/constants';
import { computeProbabilities } from '@/lib/gambling/wheel/engine';
import type { AdminSegment } from '@/lib/gambling/types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiClock,
  FiLoader,
  FiSave,
  FiSettings,
  FiSliders,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi';

interface WheelConfigState {
  enabled: boolean;
  entry_cost: number;
  segment_count: number;
}

interface SpinRow {
  spinId: string;
  userName: string;
  reward: number;
  segmentIndex: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

function makeSegment(position: number): AdminSegment {
  return {
    position,
    reward_amount: 0,
    weight: 1,
    color: DEFAULT_SEGMENT_COLORS[position % DEFAULT_SEGMENT_COLORS.length],
    label: '',
    icon: null,
  };
}

export default function AdminWheelPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'segments' | 'history'>('general');

  const [config, setConfig] = useState<WheelConfigState>({ enabled: false, entry_cost: 50, segment_count: 8 });
  const [segments, setSegments] = useState<AdminSegment[]>([]);

  const [history, setHistory] = useState<SpinRow[]>([]);
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
      const res = await fetch('/api/gambling/wheel/config', { cache: 'no-store' });
      const data = await res.json();
      setConfig({
        enabled: data.config.enabled,
        entry_cost: data.config.entry_cost,
        segment_count: data.config.segment_count,
      });
      const loaded: AdminSegment[] = (data.segments || []).map((s: any, i: number) => ({
        position: i,
        reward_amount: s.reward_amount ?? 0,
        weight: s.weight ?? 1,
        color: s.color || DEFAULT_SEGMENT_COLORS[i % DEFAULT_SEGMENT_COLORS.length],
        label: s.label || '',
        icon: s.icon ?? null,
      }));
      // Normalize length to segment_count.
      setSegments(syncLength(loaded, data.config.segment_count));
    } catch {
      setError('Failed to load wheel configuration.');
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

  function syncLength(list: AdminSegment[], count: number): AdminSegment[] {
    const next = list.slice(0, count);
    for (let i = next.length; i < count; i++) next.push(makeSegment(i));
    return next.map((s, i) => ({ ...s, position: i }));
  }

  const setSegmentCount = (count: number) => {
    setConfig((c) => ({ ...c, segment_count: count }));
    setSegments((prev) => syncLength(prev, count));
  };

  const updateSegment = (index: number, patch: Partial<AdminSegment>) => {
    setSegments((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const probabilities = useMemo(
    () => computeProbabilities(segments.map((s) => s.weight)),
    [segments],
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/gambling/wheel/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          entry_cost: config.entry_cost,
          segment_count: config.segment_count,
          segments,
        }),
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
  }, [config, segments]);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/gambling/wheel/history?page=${page}`, { cache: 'no-store' });
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
    { id: 'segments' as const, label: 'Segments', icon: <FiSliders className="w-4 h-4" /> },
    { id: 'history' as const, label: 'History', icon: <FiClock className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
            Spin the Wheel
          </h1>
          <p className="text-sm text-[rgb(var(--color-text-secondary))]">Configure the gambling wheel game.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors disabled:opacity-60"
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
                When disabled, users cannot purchase spins or access the game.
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

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Entry Cost (OZY)</h3>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Cost to purchase one spin chance.</p>
            </div>
            <input
              type="number"
              min={0}
              value={config.entry_cost}
              onChange={(e) => setConfig((c) => ({ ...c, entry_cost: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="w-28 px-3 py-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-center"
            />
          </div>

          <div>
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1">Number of Segments</h3>
            <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-3">
              The wheel regenerates dynamically for the selected count.
            </p>
            <div className="flex gap-2 flex-wrap">
              {SEGMENT_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => setSegmentCount(count)}
                  className={`w-12 h-12 rounded-xl font-bold transition-colors ${
                    config.segment_count === count
                      ? 'bg-blue-600 text-white'
                      : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))]'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Segments */}
      {activeTab === 'segments' && (
        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-start">
          <div className="space-y-3">
            <div className="hidden sm:grid grid-cols-[2rem_1fr_5rem_5rem_3rem_4rem] gap-3 px-2 text-[11px] uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">
              <span>#</span>
              <span>Label</span>
              <span>Reward</span>
              <span>Weight</span>
              <span>Color</span>
              <span>Odds</span>
            </div>
            {segments.map((seg, i) => (
              <div
                key={i}
                className="grid grid-cols-2 sm:grid-cols-[2rem_1fr_5rem_5rem_3rem_4rem] gap-3 items-center glass-blue rounded-2xl p-3 border border-[rgb(var(--color-border))]/60"
              >
                <span className="text-sm font-bold text-[rgb(var(--color-text-tertiary))]">{i + 1}</span>
                <input
                  type="text"
                  placeholder="Label"
                  value={seg.label}
                  maxLength={40}
                  onChange={(e) => updateSegment(i, { label: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-sm"
                />
                <input
                  type="number"
                  min={0}
                  value={seg.reward_amount}
                  onChange={(e) => updateSegment(i, { reward_amount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="px-2 py-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-sm text-center"
                />
                <input
                  type="number"
                  min={0}
                  value={seg.weight}
                  onChange={(e) => updateSegment(i, { weight: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="px-2 py-2 rounded-lg bg-[rgb(var(--color-bg-tertiary))] border border-[rgb(var(--color-border))] text-[rgb(var(--color-text-primary))] text-sm text-center"
                />
                <input
                  type="color"
                  value={seg.color}
                  onChange={(e) => updateSegment(i, { color: e.target.value })}
                  className="w-10 h-10 rounded-lg bg-transparent border border-[rgb(var(--color-border))] cursor-pointer"
                />
                <span className="text-sm font-semibold text-[rgb(var(--color-text-secondary))] text-center">
                  {(probabilities[i] * 100).toFixed(1)}%
                </span>
              </div>
            ))}
            <p className="text-xs text-[rgb(var(--color-text-tertiary))] px-2">
              Weight sets the relative odds a segment wins (a weight of 0 means it can never be hit). Odds are computed
              from all weights and are never exposed to players.
            </p>
          </div>

          {/* Live preview */}
          <div className="flex flex-col items-center gap-3 lg:sticky lg:top-6">
            <p className="text-xs uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Live Preview</p>
            <SpinWheel
              segments={segments.map((s) => ({ label: s.label, reward: s.reward_amount, color: s.color, icon: s.icon }))}
              size={300}
              canSpin={false}
              centerLabel=""
            />
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
                      <th className="py-2 pr-4 text-right">Reward</th>
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
                        <td className={`py-2 pr-4 text-right font-semibold ${row.reward > 0 ? 'text-green-500' : 'text-[rgb(var(--color-text-tertiary))]'}`}>
                          {row.reward > 0 ? `+${row.reward.toLocaleString()}` : '—'}
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
