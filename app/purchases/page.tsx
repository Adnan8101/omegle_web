'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import Atmosphere from '@/components/shop/Atmosphere';
import { Item, Magnetic, Reveal, RevealGroup, Words } from '@/components/motion';
import PurchaseHistoryCard, {
  EmptyPurchaseHistory,
  PurchaseHistorySkeleton,
  type OwnedPurchase,
} from './_components/PurchaseHistoryCard';

export default function PurchasesPage() {
  const { status } = useSession();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [purchases, setPurchases] = useState<OwnedPurchase[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/shop');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    (async () => {
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
    })();
  }, [status]);

  const isLoading = status === 'loading' || loading;

  return (
    <main className="relative min-h-screen overflow-x-clip bg-black pb-20 sm:pb-24">
      <Atmosphere />

      <div className="relative z-10 mx-auto w-full max-w-[820px] px-5 pt-28 sm:px-8 sm:pt-32">
        <Reveal mount dir="down" distance={12} className="mb-8">
          <Magnetic strength={0.3} max={10} className="inline-flex">
            <Link
              href="/shop"
              className="flex h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-[12.5px] font-bold text-white/70 transition-colors hover:border-white/20 hover:text-white"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to the shop
            </Link>
          </Magnetic>
        </Reveal>

        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute -right-2 -top-6 hidden lg:block" style={{ width: 140, height: 140 }}>
            <motion.div
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={reduce ? undefined : { duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/Omegle_cart.png"
                alt=""
                width={140}
                height={140}
                className="select-none"
                style={{ width: 140, height: 140, mixBlendMode: 'screen', opacity: 0.9 }}
                draggable={false}
              />
            </motion.div>
          </div>

          <RevealGroup mount stagger={0.1} className="relative max-w-[520px]">
            <Item dir="none" scale={0.9}>
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">Your history</span>
            </Item>
            <Item>
              <h1 className="mt-3 text-[clamp(32px,5.6vw,48px)] font-extrabold tracking-[-0.03em] text-white">
                <Words text="My Purchases" mount delay={0.12} distance={18} />
              </h1>
            </Item>
            <Item blur>
              <p className="mt-3 text-[14px] leading-relaxed text-white/45">
                {isLoading ? 'Loading…' : `${purchases.length} ${purchases.length === 1 ? 'purchase' : 'purchases'}`}
              </p>
            </Item>
          </RevealGroup>
        </div>

        <div className="mt-8 sm:mt-10">
          {isLoading ? (
            <PurchaseHistorySkeleton />
          ) : purchases.length === 0 ? (
            <Reveal dir="up" scale={0.98}>
              <EmptyPurchaseHistory />
            </Reveal>
          ) : (
            <div className="space-y-3.5">
              {purchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.045 }}
                >
                  <PurchaseHistoryCard purchase={purchase} currencyEmoji={currencyEmoji} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
