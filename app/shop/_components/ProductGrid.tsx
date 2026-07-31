'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ShopBudget, ShopItem } from '../_lib/types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  items: ShopItem[];
  featured: ShopItem | null;
  isLoggedIn: boolean;
  userBalance: number;
  budget: ShopBudget | null;
  currencyEmoji: string;
  purchasingId: string | null;
  onCooldown: boolean;
  cooldownLabel: string;
  onBuy: (item: ShopItem) => void;
}

export default function ProductGrid({
  items,
  featured,
  isLoggedIn,
  userBalance,
  budget,
  currencyEmoji,
  purchasingId,
  onCooldown,
  cooldownLabel,
  onBuy,
}: ProductGridProps) {
  const reduce = useReducedMotion();

  // Only the first screenful staggers; anything below arrives on time.
  const enter = (index: number) =>
    reduce
      ? { duration: 0 }
      : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const, delay: Math.min(index, 7) * 0.05 };

  const cardProps = { isLoggedIn, userBalance, budget, currencyEmoji, onCooldown, cooldownLabel, onBuy };

  return (
    <div className="space-y-4 sm:space-y-5">
      {featured && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">Pick of the shelf</span>
            <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          </div>
          <ProductCard featured item={featured} purchasing={purchasingId === featured.id} {...cardProps} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 sm:gap-5 xl:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={enter(index)}
            className="h-full"
          >
            <ProductCard item={item} purchasing={purchasingId === item.id} {...cardProps} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Matches the real card geometry so nothing shifts when data lands. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 sm:gap-5 xl:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex h-full flex-col rounded-[20px] border border-white/8 bg-white/[0.025]"
          style={{ opacity: 1 - (index % 4) * 0.07 }}
        >
          <div className="p-[6px]">
            <div className="w-full animate-pulse rounded-[16px] bg-white/[0.04]" style={{ aspectRatio: '5 / 4' }} />
          </div>
          <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
            <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="mt-2.5 h-3 w-full animate-pulse rounded-full bg-white/[0.04]" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded-full bg-white/[0.04]" />
            <div className="mt-auto pt-5">
              <div className="h-3 w-10 animate-pulse rounded-full bg-white/[0.04]" />
              <div className="mt-2 h-6 w-24 animate-pulse rounded-full bg-white/[0.04]" />
              <div className="mt-4 h-11 w-full animate-pulse rounded-xl bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
