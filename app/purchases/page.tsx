'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiPackage, FiClock, FiCheckCircle, FiCopy, FiCheck } from 'react-icons/fi';

interface Purchase {
  id: string;
  item_name: string;
  price_paid: number;
  redeem_code: string;
  status: string;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Function to convert Discord emoji to CDN URL
  const getEmojiDisplay = (emoji: string, size: string = 'w-5 h-5') => {
    const match = emoji.match(/<a?:(\w+):(\d+)>/);
    if (match) {
      const [, name, id] = match;
      const isAnimated = emoji.startsWith('<a:');
      const extension = isAnimated ? 'gif' : 'png';
      const sizeMap: { [key: string]: number } = {
        'w-4 h-4': 32,
        'w-5 h-5': 40,
        'w-6 h-6': 48,
      };
      const imgSize = sizeMap[size] || 48;
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${extension}?size=${imgSize}&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    }
    return <span className="inline-block">{emoji}</span>;
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/shop');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPurchases();
    }
  }, [status]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchases');
      const data = await res.json();
      
      if (res.ok) {
        setPurchases(data.purchases || []);
        setCurrencyEmoji(data.currencyEmoji || '🪙');
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-10 w-48 bg-[rgb(var(--color-bg-tertiary))] rounded-xl animate-pulse mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-[rgb(var(--color-bg-secondary))] rounded-2xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/shop"
            className="p-2.5 glass-blue rounded-xl border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))] apple-transition"
          >
            <FiArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[rgb(var(--color-text-primary))] tracking-tight">
              My Purchases
            </h1>
            <p className="text-sm text-[rgb(var(--color-text-secondary))]">
              {purchases.length} purchase{purchases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Purchases List */}
        {purchases.length === 0 ? (
          <div className="glass-blue rounded-3xl p-12 text-center border border-[rgb(var(--color-border))]">
            <FiPackage className="w-16 h-16 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
              No Purchases Yet
            </h2>
            <p className="text-[rgb(var(--color-text-secondary))] mb-6">
              Visit the shop to make your first purchase!
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium apple-transition"
            >
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="glass-blue rounded-2xl p-4 sm:p-6 border border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-accent))]/50 apple-transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Item Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-[rgb(var(--color-text-primary))]">
                        {purchase.item_name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        purchase.status === 'redeemed'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {purchase.status === 'redeemed' ? (
                          <span className="flex items-center gap-1">
                            <FiCheckCircle className="w-3 h-3" />
                            Redeemed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <FiClock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[rgb(var(--color-text-secondary))]">
                      <span className="flex items-center gap-1">
                        {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                        {purchase.price_paid.toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>{formatDate(purchase.created_at)}</span>
                    </div>

                    {purchase.redeemed_at && (
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))] mt-2">
                        Redeemed on {formatDate(purchase.redeemed_at)}
                      </p>
                    )}
                  </div>

                  {/* Redeem Code */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="px-4 py-2 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                      <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-1">Redeem Code</p>
                      <code className="text-sm font-mono font-bold text-[rgb(var(--color-accent))]">
                        {purchase.redeem_code}
                      </code>
                    </div>
                    <button
                      onClick={() => copyCode(purchase.redeem_code)}
                      className="px-4 py-2 bg-[rgb(var(--color-bg-secondary))] hover:bg-[rgb(var(--color-hover))] rounded-xl apple-transition flex items-center justify-center gap-2"
                    >
                      {copiedCode === purchase.redeem_code ? (
                        <>
                          <FiCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <FiCopy className="w-4 h-4" />
                          <span className="text-sm">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
