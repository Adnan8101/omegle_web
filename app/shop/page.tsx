'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowUpRight, FiClock } from 'react-icons/fi';
import { FaDiscord } from 'react-icons/fa';
import { Reveal, Words } from '@/components/motion';
import Atmosphere from '@/components/shop/Atmosphere';
import BrowseToolbar from './_components/BrowseToolbar';
import CartDock from './_components/CartDock';
import CooldownModal from './_components/CooldownModal';
import ProductGrid, { ProductGridSkeleton } from './_components/ProductGrid';
import PoolPanel from './_components/PoolPanel';
import PurchaseModal from './_components/PurchaseModal';
import PurchaseCeremony from './_components/PurchaseCeremony';
import ShopHeader from './_components/ShopHeader';
import ShopHero from './_components/ShopHero';
import { EmptyShelves, ErrorToast, GuestNote, NoMatches, ShopClosed } from './_components/ShopStates';
import {
  availabilityOf,
  formatCooldownHHMM,
  sortItems,
  type PendingPurchase,
  type PurchaseCooldown,
  type PurchaseResult,
  type ShopBudget,
  type ShopItem,
  type SortMode,
} from './_lib/types';

export default function ShopPage() {
  const { data: session, status } = useSession();

  const [items, setItems] = useState<ShopItem[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [currencyName, setCurrencyName] = useState('Ozy');
  const [userBalance, setUserBalance] = useState(0);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [budget, setBudget] = useState<ShopBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [shopDisabled, setShopDisabled] = useState(false);

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [query, setQuery] = useState('');
  const [affordableOnly, setAffordableOnly] = useState(false);

  // Shop-wide purchase cooldown: after any buy, every other item locks out until it lapses.
  const [cooldown, setCooldown] = useState<PurchaseCooldown | null>(null);
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const purchaseInFlightRef = useRef(false);
  const isLoggedIn = status === 'authenticated';

  const cooldownAvailableAt = cooldown?.enabled && cooldown.availableAt ? new Date(cooldown.availableAt).getTime() : null;
  const cooldownRemainingMs = cooldownAvailableAt !== null ? Math.max(0, cooldownAvailableAt - now) : 0;
  const isOnCooldown = isLoggedIn && cooldownRemainingMs > 0;
  const cooldownLabel = formatCooldownHHMM(cooldownRemainingMs);

  useEffect(() => {
    if (cooldownAvailableAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [cooldownAvailableAt]);

  useEffect(() => {
    if (showCooldownModal && !isOnCooldown) setShowCooldownModal(false);
  }, [showCooldownModal, isOnCooldown]);

  /* ── Data ─────────────────────────────────────────────────────── */
  const fetchShop = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shop', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        if (data.shopDisabled) {
          setShopDisabled(true);
          setCurrencyEmoji(data.config?.currencyEmoji || '🪙');
          setCurrencyName(data.config?.currencyName || 'Ozy');
        } else {
          setShopDisabled(false);
          setItems(data.items || []);
          setCurrencyEmoji(data.config?.currencyEmoji || '🪙');
          setCurrencyName(data.config?.currencyName || 'Ozy');
          if (data.budget) setBudget(data.budget);
          setCooldown(data.purchaseCooldown || null);
          setNow(Date.now());
          if (data.user) {
            setUserBalance(data.user.balance || 0);
            setPendingPurchases(data.user.pendingPurchases || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching shop:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  useEffect(() => {
    if (status === 'authenticated') fetchShop();
  }, [status, fetchShop]);

  /* ── Purchase flow ────────────────────────────────────────────── */
  const handlePurchase = (item: ShopItem) => {
    if (!session) {
      signIn('discord', { callbackUrl: '/shop' });
      return;
    }
    if (isOnCooldown) {
      setShowCooldownModal(true);
      return;
    }
    if (userBalance < item.price) {
      setError(
        `Insufficient balance. You need ${item.price.toLocaleString()} ${currencyName} but only have ${userBalance.toLocaleString()} ${currencyName}.`
      );
      return;
    }
    if (item.role_required_ids?.length > 0 && item.has_required_role === false) {
      const requiredRoles = item.role_required_ids?.length
        ? item.role_required_ids.map((id) => `<@&${id}>`).join(', ')
        : item.role_required_names?.length
        ? item.role_required_names.join(', ')
        : 'the required role';
      setError(`You need any one of the following roles to buy this item: ${requiredRoles}`);
      return;
    }
    setConfirmItem(item);
  };

  const confirmPurchase = async () => {
    if (!confirmItem) return;
    if (purchaseInFlightRef.current || purchasing) return;
    purchaseInFlightRef.current = true;
    const item = confirmItem;
    setPurchasing(item.id);
    setError(null);
    setPurchaseResult(null);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();

      if (res.status === 429 && data.cooldown) {
        setCooldown({
          enabled: true,
          hours: cooldown?.hours ?? 24,
          active: true,
          availableAt: data.cooldown.availableAt ?? new Date(Date.now() + (data.cooldown.remainingMs || 0)).toISOString(),
          remainingMs: data.cooldown.remainingMs || 0,
        });
        setNow(Date.now());
        setConfirmItem(null);
        setShowCooldownModal(true);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }
      setPurchaseResult({ ...data.purchase, dmSent: data.dmSent });
      setUserBalance(data.newBalance);
      fetchShop();
    } catch (err: any) {
      setError(err.message || 'Failed to purchase item');
    } finally {
      setPurchasing(null);
      setConfirmItem(null);
      purchaseInFlightRef.current = false;
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  /* ── Derived view state ───────────────────────────────────────── */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (needle) {
        const haystack = `${item.name} ${item.description ?? ''}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (affordableOnly && isLoggedIn && userBalance < item.price) return false;
      return true;
    });
  }, [items, query, affordableOnly, isLoggedIn, userBalance]);

  const sorted = useMemo(() => sortItems(filtered, sortMode), [filtered, sortMode]);

  /**
   * One listing gets the wide treatment: whatever members buy most, as long
   * as it's actually purchasable right now. Suppressed while filtering.
   */
  const featured = useMemo(() => {
    const browsingAll = !query.trim() && !affordableOnly;
    if (!browsingAll || items.length < 5) return null;

    const buyable = items.filter(
      (item) => !availabilityOf(item, { isLoggedIn, userBalance, budget, purchasing: false }).unavailable
    );
    if (buyable.length === 0) return null;

    return [...buyable].sort((a, b) => (b.purchase_count || 0) - (a.purchase_count || 0) || b.price - a.price)[0];
  }, [items, query, affordableOnly, isLoggedIn, userBalance, budget]);

  const gridItems = useMemo(() => (featured ? sorted.filter((item) => item.id !== featured.id) : sorted), [sorted, featured]);

  const clearFilters = () => {
    setQuery('');
    setAffordableOnly(false);
  };

  const signInDiscord = () => signIn('discord', { callbackUrl: '/shop' });
  const signOutDiscord = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    signOut({ callbackUrl: '/shop' });
  };

  /* ── Shop closed ──────────────────────────────────────────────── */
  if (!loading && shopDisabled) {
    return (
      <div className="relative min-h-screen overflow-x-clip bg-black">
        <Atmosphere />
        <ShopHeader
          user={session?.user ?? null}
          authenticated={isLoggedIn}
          balance={userBalance}
          currencyEmoji={currencyEmoji}
          currencyName={currencyName}
          onSignIn={signInDiscord}
          onSignOut={signOutDiscord}
        />
        <ShopClosed currencyName={currencyName} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-black">
      <Atmosphere />

      <ShopHeader
        user={session?.user ?? null}
        authenticated={isLoggedIn}
        balance={userBalance}
        currencyEmoji={currencyEmoji}
        currencyName={currencyName}
        onSignIn={signInDiscord}
        onSignOut={signOutDiscord}
      />

      <ShopHero currencyName={currencyName} />

      {/* ══ The shelves ══════════════════════════════════════════════ */}
      <section id="shelves" className="relative z-10 mx-auto w-full max-w-[1240px] px-5 pb-20 sm:px-8 sm:pb-24" style={{ scrollMarginTop: 96 }}>
        {budget && (
          <div className="pt-6 sm:pt-8">
            <PoolPanel budget={budget} currencyEmoji={currencyEmoji} currencyName={currencyName} />
          </div>
        )}

        {!isLoggedIn && status !== 'loading' && (
          <div className="pt-5">
            <GuestNote onSignIn={signInDiscord} />
          </div>
        )}

        {isOnCooldown && (
          <Reveal dir="up" distance={14} className="pt-5">
            <div className="flex flex-col gap-3 rounded-[20px] border border-orange-400/25 bg-orange-400/10 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="w-fit rounded-xl border border-orange-400/25 bg-orange-400/15 p-2.5">
                <FiClock className="h-5 w-5 text-orange-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">Purchase cooldown active</p>
                <p className="mt-0.5 text-xs text-white/50">
                  You already bought an item. You can buy again once the cooldown ends.
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-300/70">Time remaining</p>
                <p className="text-2xl font-black leading-tight tabular-nums text-orange-300">{cooldownLabel}</p>
              </div>
            </div>
          </Reveal>
        )}

        <Reveal dir="up" distance={16} className="pt-8 sm:pt-10">
          <h2 className="text-[clamp(24px,3.6vw,32px)] font-extrabold text-white">
            <Words text="The Shelves" stagger={0.05} />
          </h2>
        </Reveal>

        <BrowseToolbar
          total={items.length}
          shown={filtered.length}
          sort={sortMode}
          onSort={setSortMode}
          query={query}
          onQuery={setQuery}
          affordableOnly={affordableOnly}
          onAffordableOnly={setAffordableOnly}
          canFilterAffordable={isLoggedIn}
          currencyEmoji={currencyEmoji}
        />

        <div className="pt-1">
          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.24 }}>
                <ProductGridSkeleton />
              </motion.div>
            ) : items.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <EmptyShelves currencyName={currencyName} />
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div key="nomatch">
                <NoMatches query={query} onClear={clearFilters} />
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <ProductGrid
                  items={gridItems}
                  featured={featured}
                  isLoggedIn={isLoggedIn}
                  userBalance={userBalance}
                  budget={budget}
                  currencyEmoji={currencyEmoji}
                  purchasingId={purchasing}
                  onCooldown={isOnCooldown}
                  cooldownLabel={cooldownLabel}
                  onBuy={handlePurchase}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Closing note ─────────────────────────────────────────── */}
        <Reveal dir="up" distance={18} className="mt-10 sm:mt-14">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-7 sm:px-8">
            <div className="min-w-0">
              <h3 className="text-[16px] font-extrabold tracking-[-0.02em] text-white">Omeglee community economy</h3>
              <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-white/45">
                Everything on these shelves is funded by the community pool and redeemed through the Omeglee
                bot in Discord. Earn {currencyName} by showing up — chatting, voice, events.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/recent-purchases"
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:border-white/20"
              >
                Recent purchases
                <FiArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <a
                href="https://discord.gg/omegle"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-[#4752C4]"
              >
                <FaDiscord className="h-4 w-4" />
                Join the server
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ══ Overlays ═════════════════════════════════════════════════ */}
      {isLoggedIn && (
        <CartDock pending={pendingPurchases} currencyEmoji={currencyEmoji} copiedCode={copiedCode} onCopy={copyCode} />
      )}

      <PurchaseModal
        item={confirmItem}
        currencyEmoji={currencyEmoji}
        currencyName={currencyName}
        userBalance={userBalance}
        purchasing={Boolean(purchasing)}
        cooldownHours={cooldown?.enabled && !isOnCooldown ? cooldown.hours : null}
        onCancel={() => setConfirmItem(null)}
        onConfirm={confirmPurchase}
      />

      <CooldownModal
        open={showCooldownModal}
        user={session?.user ?? null}
        label={cooldownLabel}
        availableAt={cooldown?.availableAt ?? null}
        onClose={() => setShowCooldownModal(false)}
      />

      {purchaseResult && (
        <PurchaseCeremony
          itemName={purchaseResult.itemName}
          itemThumbnail={items.find((item) => item.name === purchaseResult.itemName)?.thumbnail || null}
          itemValueInr={items.find((item) => item.name === purchaseResult.itemName)?.price_inr ?? null}
          pricePaid={purchaseResult.pricePaid}
          currencyEmoji={currencyEmoji}
          redeemCode={purchaseResult.redeemCode}
          expiresAt={purchaseResult.expiresAt}
          replyMessage={purchaseResult.replyMessage}
          dmSent={purchaseResult.dmSent || false}
          userAvatar={session?.user?.image || null}
          onClose={() => setPurchaseResult(null)}
        />
      )}

      <ErrorToast message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
