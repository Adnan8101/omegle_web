'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiPackage, FiX, FiArrowRight } from 'react-icons/fi';
import { Reveal, RevealGroup, Item, CountUp, Magnetic, Words } from '@/components/motion';

interface OzyShopItem {
  id: string;
  name: string;
  price: number;
  price_inr?: number | null;
  description: string | null;
  thumbnail: string | null;
}

export default function HomeShopPreview() {
  const [ozyItems, setOzyItems] = useState<OzyShopItem[]>([]);
  const [ozyLoading, setOzyLoading] = useState(true);
  const [ozyCurrencyEmoji, setOzyCurrencyEmoji] = useState('🪙');
  const [selectedOzyItem, setSelectedOzyItem] = useState<OzyShopItem | null>(null);
  const [ozyBudget, setOzyBudget] = useState<{ available: number; total_added: number } | null>(null);

  useEffect(() => {
    fetch('/api/shop', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.shopDisabled) return;
        setOzyCurrencyEmoji(data?.config?.currencyEmoji || '🪙');
        setOzyItems(
          [...(data?.items || [])]
            .sort((a: OzyShopItem, b: OzyShopItem) => b.price - a.price)
            .slice(0, 12)
        );
        if (data?.budget) setOzyBudget(data.budget);
      })
      .catch((err) => console.error('Error fetching ozy shop preview:', err))
      .finally(() => setOzyLoading(false));
  }, []);

  const formatNumber = (n: number) => n.toLocaleString();
  const renderOzyEmoji = (size: string = 'w-4 h-4') => {
    const emojiMatch = ozyCurrencyEmoji.match(/<a?:([\w_]+):(\d+)>/);
    if (emojiMatch) {
      const [, name, id] = emojiMatch;
      const isAnimated = ozyCurrencyEmoji.startsWith('<a:');
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=48&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
        />
      );
    }
    return <span className={size}>{ozyCurrencyEmoji}</span>;
  };

  return (
    <>
      <section className="relative w-full max-w-6xl z-10 py-16 sm:py-24">
        <div className="w-full px-4 sm:px-6">
          <RevealGroup stagger={0.11} className="text-center space-y-3 mb-8">
            <Item dir="none" scale={0.85} className="flex justify-center">
              <div className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                <span className="text-blue-400 font-bold text-xs uppercase tracking-wider">Introducing Ozy</span>
              </div>
            </Item>
            <Item>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[rgb(var(--color-text-primary))] leading-[1.1] tracking-tight">
                <Words text="Spend Your Ozy in the Rewards Shop" stagger={0.045} />
              </h2>
            </Item>
            <Item blur>
              <p className="text-[rgb(var(--color-text-secondary))] leading-relaxed text-base sm:text-lg max-w-2xl mx-auto">
                Earn Ozy through server activity, then redeem it for exclusive perks. Here's a look at some of the shop's most valuable items.
              </p>
            </Item>
          </RevealGroup>

          <Reveal scale={0.97} className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-start md:items-center mb-6 p-6 sm:p-7 rounded-3xl border border-[rgb(var(--color-border))]/60 bg-[rgb(var(--color-bg-secondary))]/50 backdrop-blur-xl">
            <div className="flex flex-row md:flex-col lg:flex-row items-center md:items-start lg:items-center gap-4 md:pr-8 md:border-r md:border-[rgb(var(--color-border))]">
              <img
                src="https://cdn.discordapp.com/emojis/1525594143135633539.gif?size=128"
                alt="Ozy Coin"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain select-none animate-bounce flex-shrink-0"
                style={{ animationDuration: '3.5s' }}
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))] block">Total Ozy Pool</span>
                <span className="text-2xl sm:text-3xl font-black text-yellow-500 leading-tight block">
                  {ozyBudget ? <CountUp value={ozyBudget.total_added} /> : '—'}
                </span>
                {ozyBudget && (
                  <span className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] block mt-0.5">
                    <CountUp value={ozyBudget.available} /> left to redeem
                  </span>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[rgb(var(--color-text-primary))] mb-1.5">How You Earn Ozy</h3>
              <p className="text-sm text-[rgb(var(--color-text-secondary))] leading-relaxed">
                Ozy builds up automatically the more you hang out in the server — chatting, joining voice channels, and showing up for events all add to your balance. Stay active and it keeps stacking. Redeem it anytime for roles, perks, and rewards in the shop below.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.05} className="glass-blue rounded-3xl border border-[rgb(var(--color-border))]/60 dark:border-white/10 shadow-apple-lg backdrop-blur-xl overflow-hidden">
            {ozyLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-[rgb(var(--color-border))]">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center justify-center gap-2 p-6 animate-pulse">
                    <div className="w-14 h-14 rounded-xl bg-[rgb(var(--color-bg-tertiary))]" />
                    <div className="h-3 w-16 bg-[rgb(var(--color-bg-tertiary))] rounded" />
                    <div className="h-3 w-10 bg-[rgb(var(--color-bg-tertiary))] rounded" />
                  </div>
                ))}
              </div>
            ) : ozyItems.length === 0 ? (
              <div className="text-center py-16">
                <FiPackage className="w-10 h-10 mx-auto text-[rgb(var(--color-text-tertiary))] mb-3" />
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">The shop is empty right now, check back soon!</p>
              </div>
            ) : (
              <RevealGroup
                key={ozyItems.length}
                stagger={0.05}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-[rgb(var(--color-border))]"
              >
                {ozyItems.map((item) => (
                  <Item key={item.id} distance={16} scale={0.94} className="h-full">
                    <button
                      onClick={() => setSelectedOzyItem(item)}
                      className="group relative flex flex-col items-center justify-center gap-2.5 w-full h-full p-6 sm:p-7 text-center transition-colors hover:bg-[rgb(var(--color-hover))] cursor-pointer"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[rgb(var(--color-bg-tertiary))] flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-0.5 group-active:scale-95">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <FiPackage className="w-6 h-6 text-[rgb(var(--color-text-tertiary))]" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-[rgb(var(--color-text-primary))] line-clamp-1 max-w-full">
                        {item.name}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-bold text-yellow-500 transition-transform duration-300 ease-out group-hover:scale-105">
                        {renderOzyEmoji('w-3.5 h-3.5')}
                        {formatNumber(item.price)}
                      </span>
                    </button>
                  </Item>
                ))}
              </RevealGroup>
            )}
          </Reveal>

          <Reveal delay={0.05} className="flex justify-center mt-8">
            <Magnetic strength={0.28} max={11}>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full font-semibold transition-all text-sm shadow-lg shadow-blue-500/25 group hover:gap-3 hover:shadow-xl hover:shadow-blue-500/40"
              >
                <span>Visit Rewards Shop</span>
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      {selectedOzyItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedOzyItem(null)}
        >
          <Reveal mount dir="up" distance={18} scale={0.94} duration={0.4} className="max-w-sm w-full">
          <div
            className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 w-full border border-[rgb(var(--color-border))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">{selectedOzyItem.name}</h3>
              <button onClick={() => setSelectedOzyItem(null)} className="flex-shrink-0 text-[rgb(var(--color-text-tertiary))] hover:text-[rgb(var(--color-text-primary))] transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[rgb(var(--color-bg-tertiary))] mb-4 flex items-center justify-center">
              {selectedOzyItem.thumbnail ? (
                <img src={selectedOzyItem.thumbnail} alt={selectedOzyItem.name} className="w-full h-full object-cover" />
              ) : (
                <FiPackage className="w-12 h-12 text-[rgb(var(--color-text-tertiary))]" />
              )}
            </div>
            {selectedOzyItem.description && (
              <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">{selectedOzyItem.description}</p>
            )}
            <div className="flex items-center justify-between p-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--color-text-tertiary))]">Price</span>
              <span className="flex items-center gap-1.5 text-lg font-extrabold text-yellow-500">
                {renderOzyEmoji('w-4 h-4')}
                {formatNumber(selectedOzyItem.price)}
              </span>
            </div>
            {selectedOzyItem.price_inr != null && (
              <div className="mb-4 text-right">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg">
                  Value: ₹{formatNumber(selectedOzyItem.price_inr)}
                </span>
              </div>
            )}
            <Link
              href="/shop"
              className="block text-center w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold transition-all"
            >
              View in Shop
            </Link>
          </div>
          </Reveal>
        </div>
      )}
    </>
  );
}
