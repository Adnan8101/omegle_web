'use client';

import { useState } from 'react';
import { FiAlertTriangle, FiCheck, FiCheckCircle, FiClock, FiCopy, FiExternalLink, FiPackage } from 'react-icons/fi';
import CurrencyMark from '@/components/ui/CurrencyMark';

export interface OwnedPurchase {
  id: string;
  item_id: string;
  item_name: string;
  price_paid: number;
  redeem_code: string;
  status: string;
  is_item_deleted: boolean;
  item_deleted_at: string | null;
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
}

const SUPPORT_SERVER_URL = 'https://discord.gg/omegle';

const dateFormat: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

/** One redeem-code receipt in the history list — status, code, and the fine print only when it's true. */
export default function PurchaseHistoryCard({ purchase, currencyEmoji }: { purchase: OwnedPurchase; currencyEmoji: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(purchase.redeem_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRedeemed = purchase.status === 'redeemed';
  const isExpired = !isRedeemed && purchase.is_expired;
  const badge = isRedeemed
    ? { icon: <FiCheckCircle className="h-3 w-3" />, label: 'Redeemed', className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' }
    : isExpired
    ? { icon: <FiAlertTriangle className="h-3 w-3" />, label: 'Expired', className: 'border-red-400/30 bg-red-400/10 text-red-300' }
    : { icon: <FiClock className="h-3 w-3" />, label: 'Pending', className: 'border-amber-400/30 bg-amber-400/10 text-amber-300' };

  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-white/15 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* ── Item + meta ─────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-[16px] font-extrabold text-white">{purchase.item_name}</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${badge.className}`}>
              {badge.icon}
              {badge.label}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[12.5px] text-white/45">
            <span className="flex items-center gap-1.5">
              <CurrencyMark emoji={currencyEmoji} size={13} />
              <span className="tabular-nums text-white/70">{purchase.price_paid.toLocaleString()}</span>
            </span>
            <span className="text-white/20">•</span>
            <span>{new Date(purchase.created_at).toLocaleString('en-US', dateFormat)}</span>
          </div>

          {purchase.redeemed_at && (
            <p className="mt-1.5 text-[11.5px] text-white/30">
              Redeemed {new Date(purchase.redeemed_at).toLocaleString('en-US', dateFormat)}
            </p>
          )}
          {purchase.status !== 'redeemed' && purchase.expires_at && (
            <p className="mt-1.5 text-[11.5px] text-white/30">
              {purchase.is_expired ? 'Expired' : 'Expires'} {new Date(purchase.expires_at).toLocaleString('en-US', dateFormat)}
            </p>
          )}

          {purchase.is_item_deleted && purchase.status !== 'redeemed' && (
            <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3">
              <div className="flex items-start gap-2">
                <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                <div className="space-y-1.5">
                  <p className="text-[12.5px] font-bold text-amber-200">This item was removed from the shop.</p>
                  <p className="text-[11.5px] text-amber-200/80">
                    Your redeem code above is still valid — staff can review it in Discord if needed.
                  </p>
                </div>
              </div>
              <a
                href={SUPPORT_SERVER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11.5px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/20"
              >
                <FiExternalLink className="h-3.5 w-3.5" />
                Join Discord Server
              </a>
            </div>
          )}
        </div>

        {/* ── Redeem code ───────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <code className="rounded-xl border border-white/8 bg-black/40 px-4 py-2.5 font-mono text-[13px] font-bold tracking-[0.1em] text-[#ffd77a]">
            {purchase.redeem_code}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy redeem code"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/8 transition-colors hover:bg-white/[0.06]"
          >
            {copied ? <FiCheck className="h-4 w-4 text-emerald-400" /> : <FiCopy className="h-4 w-4 text-white/45" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PurchaseHistorySkeleton() {
  return (
    <div className="space-y-3.5" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-[122px] animate-pulse rounded-[20px] border border-white/8 bg-white/[0.02]" style={{ opacity: 1 - index * 0.1 }} />
      ))}
    </div>
  );
}

export function EmptyPurchaseHistory() {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.05]">
        <FiPackage className="h-6 w-6 text-white/30" />
      </span>
      <h2 className="mt-5 text-[20px] font-extrabold tracking-[-0.02em] text-white">Nothing here yet</h2>
      <p className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed text-white/45">
        Everything you redeem from the shop shows up here, with the code ready to copy.
      </p>
    </div>
  );
}
