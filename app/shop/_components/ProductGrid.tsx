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
  onBuy,
}: ProductGridProps) {
  const reduce = useReducedMotion();

  // Only the first screenful staggers; anything below arrives on time. Keeps a
  // forty-item shop from spending two seconds dealing itself out.
  const enter = (index: number) =>
    reduce
      ? { duration: 0 }
      : { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay: Math.min(index, 7) * 0.055 };

  return (
    <div className="space-y-4 sm:space-y-5">
      {featured && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 26, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="sx-eyebrow">Pick of the shelf</span>
            <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--sx-hair-2), transparent)' }} />
          </div>
          <ProductCard
            featured
            item={featured}
            isLoggedIn={isLoggedIn}
            userBalance={userBalance}
            budget={budget}
            currencyEmoji={currencyEmoji}
            purchasing={purchasingId === featured.id}
            onBuy={onBuy}
          />
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 sm:gap-5 xl:grid-cols-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 22, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-40px' }}
            transition={enter(index)}
            className="h-full"
          >
            <ProductCard
              item={item}
              isLoggedIn={isLoggedIn}
              userBalance={userBalance}
              budget={budget}
              currencyEmoji={currencyEmoji}
              purchasing={purchasingId === item.id}
              onBuy={onBuy}
            />
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
          className="flex h-full flex-col border"
          style={{
            borderRadius: 'var(--sx-r-lg)',
            borderColor: 'var(--sx-hair)',
            background: 'linear-gradient(168deg, rgba(255,255,255,0.04), rgba(255,255,255,0.012))',
            // A touch of drift between placeholders so the wall of them breathes.
            opacity: 1 - (index % 4) * 0.07,
          }}
        >
          <div className="p-[6px]">
            <div
              className="sx-skel w-full"
              style={{ aspectRatio: '5 / 4', borderRadius: 'calc(var(--sx-r-lg) - 7px)' }}
            />
          </div>
          <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
            <div className="sx-skel h-4 w-3/4 rounded-full" />
            <div className="sx-skel mt-2.5 h-3 w-full rounded-full" />
            <div className="sx-skel mt-2 h-3 w-2/5 rounded-full" />
            <div className="mt-auto pt-5">
              <div className="sx-skel h-3 w-10 rounded-full" />
              <div className="sx-skel mt-2 h-6 w-24 rounded-full" />
              <div className="sx-skel mt-4 h-11 w-full" style={{ borderRadius: 'var(--sx-r-sm)' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
