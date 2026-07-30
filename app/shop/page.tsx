'use client';
import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import CrateReveal from '@/components/CrateReveal';
import { useRouter } from 'next/navigation';
import { useEffect,useRef,useState } from 'react';
import {
FiAlertCircle,
FiCheck,
FiClock,
FiCopy,
FiDollarSign,
FiLock,
FiMessageCircle,
FiPackage,
FiRefreshCw,
FiShoppingCart,
FiX,
FiFilter,
FiLogOut
} from 'react-icons/fi';
interface ShopItem {
  id: string;
  name: string;
  price: number;
  price_inr?: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  income_amount: number | null;
  time_hours: number | null;
  role_required_ids: string[];
  role_required_names: string[];
  has_required_role: boolean | null;
  required_balance: number | null;
  expires_at: string | null;
  out_of_stock?: boolean;
  enabled: boolean;
  sort_order?: number;
  purchase_count?: number;
}
interface PendingPurchase {
  id: string;
  itemName: string;
  pricePaid: number;
  redeemCode: string;
  createdAt: string;
  expiresAt: string | null;
}
interface PurchaseCooldown {
  enabled: boolean;
  hours: number;
  active: boolean;
  availableAt: string | null;
  remainingMs: number;
}
interface PurchaseResult {
  id: string;
  itemName: string;
  pricePaid: number;
  redeemCode: string;
  replyMessage: string | null;
  createdAt: string;
  expiresAt: string | null;
  dmSent?: boolean;
}
export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [currencyEmoji, setCurrencyEmoji] = useState('🪙');
  const [currencyName, setCurrencyName] = useState('Ozy');
  const [userBalance, setUserBalance] = useState(0);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showPurchases, setShowPurchases] = useState(false);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [shopDisabled, setShopDisabled] = useState(false);
  const [budget, setBudget] = useState<{ available: number; total_added: number; total_spent: number } | null>(null);
  const [sortMode, setSortMode] = useState<'default' | 'low' | 'high' | 'popular'>('default');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempSortMode, setTempSortMode] = useState<'default' | 'low' | 'high' | 'popular'>('default');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [cooldown, setCooldown] = useState<PurchaseCooldown | null>(null);
  const [showCooldownModal, setShowCooldownModal] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const purchaseInFlightRef = useRef(false);


  const cooldownAvailableAt = cooldown?.enabled && cooldown.availableAt
    ? new Date(cooldown.availableAt).getTime()
    : null;
  const cooldownRemainingMs = cooldownAvailableAt !== null ? Math.max(0, cooldownAvailableAt - now) : 0;
  const isOnCooldown = status === 'authenticated' && cooldownRemainingMs > 0;


  useEffect(() => {
    if (cooldownAvailableAt === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [cooldownAvailableAt]);


  useEffect(() => {
    if (showCooldownModal && !isOnCooldown) {
      setShowCooldownModal(false);
    }
  }, [showCooldownModal, isOnCooldown]);

  useEffect(() => {
    fetchShop();
  }, []);

  
  useEffect(() => {
    if (status === 'authenticated') {
      fetchShop();
    }
  }, [status]);
  const getEmojiDisplay = (emoji: string, size: string = 'w-6 h-6', textClass: string = 'text-xl') => {
    const emojiMatch = emoji.match(/<a?:([\w_]+):(\d+)>/);
    if (emojiMatch) {
      const [, name, id] = emojiMatch;
      const isAnimated = emoji.startsWith('<a:');
      const extension = isAnimated ? 'gif' : 'png';
      return (
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${extension}?size=48&quality=lossless`}
          alt={name}
          className={`inline-block ${size}`}
          style={{ verticalAlign: 'middle' }}
        />
      );
    }
    return <span className={textClass} style={{ verticalAlign: 'middle' }}>{emoji}</span>;
  };
  const fetchShop = async () => {
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
          if (data.budget) {
            setBudget(data.budget);
          }
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
  };
  const handlePurchase = async (item: ShopItem) => {

    if (!session) {
      signIn('discord', { callbackUrl: '/shop' });
      return;
    }

    if (isOnCooldown) {
      setShowCooldownModal(true);
      return;
    }
    if (userBalance < item.price) {
      setError(`Insufficient balance. You need ${item.price.toLocaleString()} ${currencyName} but only have ${userBalance.toLocaleString()} ${currencyName}.`);
      return;
    }
    if (item.role_required_ids?.length > 0 && item.has_required_role === false) {
      const requiredRoles = item.role_required_ids?.length
        ? item.role_required_ids.map((id) => `<@&${id}>`).join(', ')
        : (item.role_required_names?.length ? item.role_required_names.join(', ') : 'the required role');
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
        body: JSON.stringify({ itemId: item.id })
      });
      const data = await res.json();
      if (res.status === 429 && data.cooldown) {

        setCooldown({
          enabled: true,
          hours: cooldown?.hours ?? 24,
          active: true,
          availableAt: data.cooldown.availableAt ?? new Date(Date.now() + (data.cooldown.remainingMs || 0)).toISOString(),
          remainingMs: data.cooldown.remainingMs || 0
        });
        setNow(Date.now());
        setConfirmItem(null);
        setShowCooldownModal(true);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }
      setPurchaseResult({
        ...data.purchase,
        dmSent: data.dmSent
      });
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
  const formatNumber = (n: number) => n.toLocaleString();

  const formatHHMM = (ms: number) => {
    const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };
  const cooldownLabel = formatHHMM(cooldownRemainingMs);
  if (loading) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[rgb(var(--color-text-tertiary))] animate-pulse">Loading shop...</p>
        </div>
      </div>
    );
  }
  if (!loading && shopDisabled) {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6">
        <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="p-5 bg-yellow-500/10 rounded-full border border-yellow-500/30 inline-block">
              <FiShoppingCart className="w-10 h-10 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                Shop is Closed
              </h2>
              <p className="text-[rgb(var(--color-text-secondary))]">
                The shop is currently closed for maintenance. Please check back later!
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))]">
      <section className="max-w-7xl mx-auto px-4 pt-5 pb-2">
        <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-bg-secondary))] px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div>
              <h1 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Omeglee Shop</h1>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Casino Economy Store</p>
            </div>
            <nav className="flex items-center gap-4 text-xs font-semibold text-[rgb(var(--color-text-secondary))] sm:border-l sm:border-[rgb(var(--color-border))] pl-0 sm:pl-8">
              <Link href="/" className="hover:text-[rgb(var(--color-text-primary))] transition-colors">Home</Link>
              <Link href="/staff-application" className="hover:text-[rgb(var(--color-text-primary))] transition-colors">Staff Application</Link>
              <Link href="/recent-purchases" className="hover:text-[rgb(var(--color-text-primary))] transition-colors">Recent Purchases</Link>
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
            {session ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-yellow-500/5 border border-amber-500/25 rounded-2xl shadow-[0_0_12px_rgba(245,158,11,0.12)] whitespace-nowrap flex-shrink-0 select-none">
                  <div className="flex items-center justify-center p-1 bg-amber-500/15 rounded-lg border border-amber-500/20">
                    {getEmojiDisplay(currencyEmoji, 'w-4 h-4', 'text-xs')}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-bold text-amber-500/70 uppercase tracking-wider leading-none">Your Balance</span>
                    <span className="font-extrabold text-yellow-500 text-sm leading-tight mt-0.5">
                      {formatNumber(userBalance)} <span className="text-[10px] font-semibold text-yellow-500/80">{currencyName}</span>
                    </span>
                  </div>
                </div>
                <Link
                  href="/purchases"
                  className="hidden sm:inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[rgb(var(--color-bg-tertiary))]/80 hover:bg-[rgb(var(--color-hover))] border border-[rgb(var(--color-border))] transition-all text-xs font-semibold text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] shadow-sm"
                  title="See all your stuff"
                >
                  <FiPackage className="w-4 h-4 text-blue-400" />
                  <span>My Stuff</span>
                </Link>
                <Link
                  href="/purchases"
                  className="relative p-2.5 rounded-2xl bg-[rgb(var(--color-bg-tertiary))]/80 hover:bg-[rgb(var(--color-hover))] border border-[rgb(var(--color-border))] transition-all shadow-sm"
                  title="My Purchases"
                >
                  <FiShoppingCart className="w-4 h-4 text-blue-400" />
                  {pendingPurchases.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border border-[rgb(var(--color-bg-secondary))] animate-pulse">
                      {pendingPurchases.length}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <img
                    src={session.user?.image || `https://cdn.discordapp.com/embed/avatars/0.png`}
                    alt="Avatar"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-9 h-9 rounded-2xl border-2 border-blue-500/20 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm"
                  />
                  {showProfileMenu && (
                    <>
                      {}
                      <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                      
                      <div className="absolute right-0 mt-2 w-48 bg-[rgb(var(--color-bg-secondary))] border border-[rgb(var(--color-border))] rounded-2xl shadow-xl py-2 z-50 animate-scale-in origin-top-right">
                        <div className="px-4 py-2 border-b border-[rgb(var(--color-border))]">
                          <p className="text-xs font-bold text-[rgb(var(--color-text-primary))] truncate">
                            {session.user?.name || 'Discord User'}
                          </p>
                          <p className="text-[10px] text-[rgb(var(--color-text-tertiary))] truncate mt-0.5">
                            ID: {session.user?.id || ''}
                          </p>
                        </div>
                        
                        <Link
                          href="/purchases"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
                        >
                          <FiShoppingCart className="w-3.5 h-3.5 text-blue-400" />
                          <span>My Purchases</span>
                        </Link>
                        
                        <Link
                          href="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[rgb(var(--color-text-secondary))] hover:text-[rgb(var(--color-text-primary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
                        >
                          <FiLock className="w-3.5 h-3.5 text-purple-400" />
                          <span>Admin Panel</span>
                        </Link>
                        
                        <div className="border-t border-[rgb(var(--color-border))] mt-1 pt-1">
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
                              signOut({ callbackUrl: '/shop' });
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-500 hover:bg-[rgb(var(--color-hover))] transition-colors text-left"
                          >
                            <FiLogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <span className="text-xs font-semibold text-[rgb(var(--color-text-tertiary))] bg-[rgb(var(--color-bg-tertiary))]/80 px-3.5 py-2 rounded-xl border border-[rgb(var(--color-border))] shadow-sm">
                Guest Visitor
              </span>
            )}
          </div>
        </div>
      </section>
      {}
      {showCooldownModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 max-w-sm w-full border border-[rgb(var(--color-border))] shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
              <FiClock className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-1">Purchase Cooldown Active</h3>
            <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-5">
              You can buy your next item once the cooldown ends.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgb(var(--color-bg-tertiary))] mb-4 text-left">
              <img
                src={session?.user?.image || 'https://cdn.discordapp.com/embed/avatars/0.png'}
                alt={session?.user?.name || 'You'}
                className="w-11 h-11 rounded-full border border-[rgb(var(--color-border))]"
              />
              <div className="min-w-0">
                <p className="font-semibold text-[rgb(var(--color-text-primary))] truncate">
                  {session?.user?.name || 'Discord User'}
                </p>
                <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] truncate">
                  ID: {session?.user?.id || ''}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80">Time Remaining</p>
              <p className="text-3xl font-black text-orange-400 tabular-nums mt-1">{cooldownLabel}</p>
              <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] mt-1">HH:MM</p>
              {cooldown?.availableAt && (
                <p className="text-[11px] text-[rgb(var(--color-text-tertiary))] mt-2">
                  Unlocks at {new Date(cooldown.availableAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCooldownModal(false)}
              className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors font-semibold text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {}
      {confirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 max-w-md w-full border border-[rgb(var(--color-border))] shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <FiShoppingCart className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Confirm Purchase</h3>
              <p className="text-[rgb(var(--color-text-secondary))] mb-4">
                You are about to buy:
              </p>
              {}
              <div className="p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl mb-4 flex items-center gap-4">
                {confirmItem.thumbnail ? (
                  <img
                    src={confirmItem.thumbnail}
                    alt={confirmItem.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
                    <FiPackage className="w-8 h-8 text-[rgb(var(--color-text-tertiary))]" />
                  </div>
                )}
                <div className="text-left flex-1">
                  <p className="font-semibold text-[rgb(var(--color-text-primary))]">{confirmItem.name}</p>
                  <div className="flex items-center gap-1">
                    {getEmojiDisplay(confirmItem.thumbnail ? currencyEmoji : currencyEmoji, 'w-5 h-5')}
                    <p className="text-lg font-bold text-yellow-500">{formatNumber(confirmItem.price)}</p>
                  </div>
                </div>
              </div>
              {/* Balance summary */}
              <div className="space-y-2 mb-6 text-left">
                <div className="flex justify-between items-center p-3 bg-[rgb(var(--color-bg-tertiary))] rounded-lg">
                  <span className="text-[rgb(var(--color-text-secondary))]">Your Balance</span>
                  <div className="flex items-center gap-1.5">
                    {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                    <span className="font-semibold text-[rgb(var(--color-text-primary))]">{formatNumber(userBalance)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg">
                  <span className="text-red-400">Amount</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-red-400">-</span>
                    {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                    <span className="font-semibold text-red-400">{formatNumber(confirmItem.price)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <span className="text-green-400 font-medium">Balance After</span>
                  <div className="flex items-center gap-1.5">
                    {getEmojiDisplay(currencyEmoji, 'w-4 h-4')}
                    <span className="font-bold text-green-400">{formatNumber(userBalance - confirmItem.price)}</span>
                  </div>
                </div>
              </div>
              {/* Cooldown warning — shown only if cooldown is enabled and user is not already on cooldown */}
              {cooldown?.enabled && !isOnCooldown && (
                <div className="mb-5 p-3 bg-orange-500/10 border border-orange-500/25 rounded-xl flex items-start gap-2.5">
                  <FiClock className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-orange-400">Purchase Cooldown</p>
                    <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
                      Buying this item will start a <strong className="text-orange-400">{cooldown.hours}h</strong> cooldown.
                      You won't be able to buy again until{' '}
                      <strong className="text-orange-400">
                        {new Date(Date.now() + cooldown.hours * 3_600_000).toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </strong>.
                    </p>
                  </div>
                </div>
              )}
              {}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmItem(null)}
                  disabled={Boolean(purchasing)}
                  className="flex-1 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  disabled={Boolean(purchasing)}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-semibold"
                >
                  {purchasing ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {}
      {isFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 max-w-md w-full border border-[rgb(var(--color-border))] shadow-xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-500/15 rounded-full flex items-center justify-center">
                <FiFilter className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-[rgb(var(--color-text-primary))]">Sort & Filter</h3>
              <p className="text-xs text-[rgb(var(--color-text-secondary))]">Choose how you want to sort the items in the shop</p>
            </div>

            <div className="space-y-2 mb-6">
              <button
                onClick={() => setTempSortMode('default')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  tempSortMode === 'default'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-[rgb(var(--color-bg-tertiary))] border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                <span className="text-sm">Default Order</span>
                {tempSortMode === 'default' && <FiCheck className="w-4 h-4 text-blue-400" />}
              </button>
              <button
                onClick={() => setTempSortMode('low')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  tempSortMode === 'low'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-[rgb(var(--color-bg-tertiary))] border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                <span className="text-sm">Lowest to Highest Price</span>
                {tempSortMode === 'low' && <FiCheck className="w-4 h-4 text-blue-400" />}
              </button>
              <button
                onClick={() => setTempSortMode('high')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  tempSortMode === 'high'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-[rgb(var(--color-bg-tertiary))] border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                <span className="text-sm">Highest to Lowest Price</span>
                {tempSortMode === 'high' && <FiCheck className="w-4 h-4 text-blue-400" />}
              </button>
              <button
                onClick={() => setTempSortMode('popular')}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  tempSortMode === 'popular'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-semibold'
                    : 'bg-[rgb(var(--color-bg-tertiary))] border-[rgb(var(--color-border))] text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-hover))]'
                }`}
              >
                <span className="text-sm">Most Purchased</span>
                {tempSortMode === 'popular' && <FiCheck className="w-4 h-4 text-blue-400" />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors font-medium text-sm text-[rgb(var(--color-text-secondary))]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSortMode(tempSortMode);
                  setIsFilterOpen(false);
                }}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {purchaseResult && (
        <CrateReveal
          itemName={purchaseResult.itemName}
          itemThumbnail={items.find(i => i.name === purchaseResult.itemName)?.thumbnail || null}
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
      {}
      {showPurchases && pendingPurchases.length > 0 && (
        <div className="fixed top-20 right-4 left-4 sm:left-auto sm:w-80 z-40 bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))] shadow-xl">
          <div className="p-4 border-b border-[rgb(var(--color-border))] flex items-center justify-between">
            <h3 className="font-semibold text-[rgb(var(--color-text-primary))]">Pending Purchases</h3>
            <button onClick={() => setShowPurchases(false)}>
              <FiX className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {pendingPurchases.map((purchase) => (
              <div key={purchase.id} className="p-4 border-b border-[rgb(var(--color-border))] last:border-b-0">
                <p className="font-medium text-[rgb(var(--color-text-primary))]">{purchase.itemName}</p>
                <div className="flex items-center justify-between mt-2">
                  <code className="text-sm font-mono text-yellow-500">{purchase.redeemCode}</code>
                  <button
                    onClick={() => copyCode(purchase.redeemCode)}
                    className="p-1.5 rounded-lg hover:bg-[rgb(var(--color-bg-tertiary))] transition-colors"
                  >
                    {copiedCode === purchase.redeemCode ? (
                      <FiCheck className="w-4 h-4 text-green-500" />
                    ) : (
                      <FiCopy className="w-4 h-4 text-[rgb(var(--color-text-tertiary))]" />
                    )}
                  </button>
                </div>
                {purchase.expiresAt && (
                  <p className="mt-2 text-xs text-[rgb(var(--color-text-tertiary))]">
                    Expires on {new Date(purchase.expiresAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 shadow-xl max-w-[calc(100vw-2rem)] w-auto">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-500">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
      {}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {budget && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-[rgb(var(--color-bg-secondary))]/40 border border-[rgb(var(--color-border))] rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-lg">
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold tracking-wider text-[rgb(var(--color-text-tertiary))] uppercase">
                    Reward Pool
                  </div>
                  <h2 className="text-xl font-extrabold text-[rgb(var(--color-text-primary))] mt-0.5">
                    Community Reward Pool
                  </h2>
                </div>
                {}
                <div className="md:hidden">
                  <button
                    onClick={() => {
                      setTempSortMode(sortMode);
                      setIsFilterOpen(true);
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))] rounded-xl transition-all shadow-sm"
                  >
                    <FiFilter className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold">Filter</span>
                  </button>
                </div>
              </div>

              {}
              <div className="space-y-3">
                {(() => {
                  const percent = budget.total_added > 0 ? Math.min(100, Math.max(0, Math.round((budget.available / budget.total_added) * 100))) : 0;
                  
                  let barColorClass = '';
                  let textHighlightClass = '';
                  let glowShadowStyle = '';

                  if (percent >= 70) {
                    barColorClass = 'bg-gradient-to-r from-emerald-500 to-green-400';
                    textHighlightClass = 'text-green-400';
                    glowShadowStyle = 'rgba(52,211,153,0.4)';
                  } else if (percent >= 40) {
                    barColorClass = 'bg-gradient-to-r from-yellow-500 to-amber-400';
                    textHighlightClass = 'text-yellow-400';
                    glowShadowStyle = 'rgba(245,158,11,0.4)';
                  } else if (percent >= 15) {
                    barColorClass = 'bg-gradient-to-r from-orange-500 to-amber-500';
                    textHighlightClass = 'text-orange-400';
                    glowShadowStyle = 'rgba(249,115,22,0.4)';
                  } else {
                    barColorClass = 'bg-gradient-to-r from-rose-600 to-red-500';
                    textHighlightClass = 'text-red-500';
                    glowShadowStyle = 'rgba(239,68,68,0.5)';
                  }

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))]/60 border border-[rgb(var(--color-border))]/55 rounded-2xl">
                          <span className="text-[10px] sm:text-[11px] font-bold text-[rgb(var(--color-text-secondary))] block uppercase tracking-wider">Total Budget</span>
                          <span className="text-lg sm:text-xl font-black text-yellow-500 mt-1 flex items-center gap-1.5 flex-wrap">
                            {getEmojiDisplay(currencyEmoji, 'w-4 h-4', 'text-xs')}
                            {formatNumber(budget.total_added)}
                          </span>
                        </div>
                        <div className="p-3 sm:p-4 bg-[rgb(var(--color-bg-tertiary))]/60 border border-[rgb(var(--color-border))]/55 rounded-2xl">
                          <span className="text-[10px] sm:text-[11px] font-bold text-[rgb(var(--color-text-secondary))] block uppercase tracking-wider">Remaining Budget</span>
                          <span className="text-lg sm:text-xl font-black text-blue-400 mt-1 flex items-center gap-1.5 flex-wrap">
                            {getEmojiDisplay(currencyEmoji, 'w-4 h-4', 'text-xs')}
                            {formatNumber(budget.available)}
                            <span className="text-[10px] sm:text-xs font-semibold text-blue-400/70">({percent}%)</span>
                          </span>
                        </div>
                      </div>

                      {}
                      {budget.total_added > 0 && (
                        <div className="space-y-2 mt-2">
                          <div className="relative w-full bg-[rgb(var(--color-bg-tertiary))] rounded-full h-1.5">
                            <div
                              className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${barColorClass}`}
                              style={{ width: `${percent}%`, boxShadow: `0 0 10px ${glowShadowStyle}` }}
                            />
                            <div
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full border border-blue-500/50 shadow-[0_0_8px_rgba(255,255,255,0.9)] transition-all duration-500"
                              style={{ left: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-[rgb(var(--color-text-tertiary))] px-0.5 select-none">
                            <span>0</span>
                            <span>{formatNumber(budget.total_added)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => {
                  setTempSortMode(sortMode);
                  setIsFilterOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] text-[rgb(var(--color-text-primary))] border border-[rgb(var(--color-border))] rounded-2xl transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                title="Sort & Filter Items"
              >
                <FiFilter className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold">Sort & Filter</span>
              </button>
            </div>
          </div>
        )}

        {}
        {status !== 'authenticated' && (
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
            <FiLock className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <p className="text-[rgb(var(--color-text-secondary))] text-sm">
              Login to view your balance and buy items
            </p>
          </div>
        )}
        {}
        {isOnCooldown && (
          <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="p-2.5 bg-orange-500/15 rounded-xl border border-orange-500/25 w-fit">
              <FiClock className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-[rgb(var(--color-text-primary))] text-sm">Purchase cooldown active</p>
              <p className="text-xs text-[rgb(var(--color-text-secondary))] mt-0.5">
                You already bought an item. You can buy again once the cooldown ends.
              </p>
              {cooldown?.availableAt && (
                <p className="text-xs text-orange-400 mt-1 font-medium">
                  Unlocks at {new Date(cooldown.availableAt).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400/80">Time Remaining</p>
              <p className="text-2xl font-black text-orange-400 tabular-nums leading-tight">{cooldownLabel}</p>
              <p className="text-[10px] text-[rgb(var(--color-text-tertiary))]">HH:MM</p>
            </div>
          </div>
        )}

        {}
        {loading ? (
          <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))] overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-[rgb(var(--color-bg-tertiary))]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[rgb(var(--color-bg-tertiary))] rounded w-3/4" />
                  <div className="h-3 bg-[rgb(var(--color-bg-tertiary))] rounded w-1/2" />
                  <div className="flex justify-between items-center pt-1">
                    <div className="h-6 bg-[rgb(var(--color-bg-tertiary))] rounded w-1/3" />
                    <div className="h-9 bg-[rgb(var(--color-bg-tertiary))] rounded-xl w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <FiPackage className="w-16 h-16 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">No Items Available</h2>
            <p className="text-[rgb(var(--color-text-secondary))]">Check back later for new items!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...items]
              .sort((a, b) => {
                if (sortMode === 'low') return a.price - b.price;
                if (sortMode === 'high') return b.price - a.price;
                if (sortMode === 'popular') return (b.purchase_count || 0) - (a.purchase_count || 0);
                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
              })
              .map((item) => {
              const isLoggedIn = status === 'authenticated';
              const canAfford = isLoggedIn ? userBalance >= item.price : true;
              const isOutOfStock = item.out_of_stock || (item.stock !== null && item.stock !== -1 && item.stock <= 0);
              const isDisabled = !item.enabled;
              const isInsufficientBudget = Boolean(budget && budget.available < item.price);
              const missingRequiredRole = Boolean(isLoggedIn && item.role_required_ids?.length > 0 && item.has_required_role === false);
              const isUnavailable = isOutOfStock || isDisabled || isInsufficientBudget;
              const daysLeft = item.expires_at
                ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div
                  key={item.id}
                  className={`bg-[rgb(var(--color-bg-secondary))] rounded-2xl border overflow-hidden transition-all hover:shadow-lg ${
                    isOutOfStock || isDisabled
                      ? 'border-red-500/30 opacity-75 hover:border-red-500/50 hover:shadow-red-500/10'
                      : isInsufficientBudget
                      ? 'border-orange-500/30 opacity-75 hover:border-orange-500/50 hover:shadow-orange-500/10'
                      : 'border-[rgb(var(--color-border))] hover:border-yellow-500/30 hover:shadow-yellow-500/10'
                  }`}
                >
                  {}
                  <div className="aspect-[4/3] bg-[rgb(var(--color-bg-tertiary))] relative overflow-hidden">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className={`w-full h-full object-cover object-center ${isUnavailable ? 'grayscale' : ''}`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-16 h-16 text-[rgb(var(--color-text-tertiary))]" />
                      </div>
                    )}
                    {}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-lg transform -rotate-12 shadow-lg">
                          OUT OF STOCK
                        </div>
                      </div>
                    )}
                    {}
                    {isDisabled && !isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-lg transform -rotate-12 shadow-lg">
                          UNAVAILABLE
                        </div>
                      </div>
                    )}
                    {}
                    {isInsufficientBudget && !isDisabled && !isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-lg transform -rotate-12 shadow-lg">
                          UNAVAILABLE
                        </div>
                      </div>
                    )}
                    {}
                    {!isOutOfStock && item.stock !== null && item.stock !== -1 && (
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold ${
                        item.stock <= 5 ? 'bg-orange-500/90 text-white' :
                        'bg-[rgb(var(--color-bg-secondary))]/90 text-[rgb(var(--color-text-primary))]'
                      }`}>
                        {item.stock} left
                      </div>
                    )}
                    {}
                    {daysLeft !== null && daysLeft <= 7 && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-red-500/90 rounded-lg text-xs font-semibold text-white flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {daysLeft}d left
                      </div>
                    )}
                  </div>
                  {}
                  <div className="p-4">
                    <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-3 line-clamp-2">{item.description}</p>
                    )}
                    {}
                    {item.income_amount && item.time_hours && (
                      <div className="text-xs text-green-500 mb-3 flex items-center gap-1.5">
                        <FiDollarSign className="w-3 h-3" />
                        +{getEmojiDisplay(currencyEmoji, 'w-3.5 h-3.5')}
                        {formatNumber(item.income_amount)} every {item.time_hours}h
                      </div>
                    )}
                    {}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          {getEmojiDisplay(currencyEmoji, 'w-4 h-4', 'text-sm')}
                          <span className="text-lg sm:text-xl font-bold text-[rgb(var(--color-text-primary))]">
                            {formatNumber(item.price)}
                          </span>
                        </div>
                        {item.price_inr !== undefined && item.price_inr !== null && (
                          <span className="text-[10px] sm:text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 sm:px-2.5 py-0.5 rounded-lg mt-1 w-fit block shadow-sm">
                            Value: ₹{formatNumber(item.price_inr)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={purchasing === item.id || isUnavailable || (isLoggedIn && !isOnCooldown && (!canAfford || missingRequiredRole))}
                        className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 ${
                          isOutOfStock || isDisabled
                            ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                            : isInsufficientBudget
                            ? 'bg-orange-500/20 text-orange-400 cursor-not-allowed'
                            : isLoggedIn && isOnCooldown
                            ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                            : isLoggedIn && missingRequiredRole
                            ? 'bg-orange-500/20 text-orange-400 cursor-not-allowed'
                            : !isLoggedIn
                            ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                            : canAfford
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                        ) : isOutOfStock ? (
                          'Sold Out'
                        ) : isDisabled ? (
                          'Unavailable'
                        ) : isInsufficientBudget ? (
                          'Unavailable'
                        ) : isLoggedIn && isOnCooldown ? (
                          <>
                            <FiClock className="w-3.5 h-3.5" />
                            {cooldownLabel}
                          </>
                        ) : isLoggedIn && missingRequiredRole ? (
                          'Role Required'
                        ) : !isLoggedIn ? (
                          'Buy'
                        ) : canAfford ? (
                          'Buy'
                        ) : (
                          'Not Enough'
                        )}
                      </button>
                    </div>
                    {}
                    {isLoggedIn && item.required_balance && userBalance < item.required_balance && (
                      <div className="text-xs text-orange-500 mt-2 flex items-center gap-1.5">
                        <FiAlertCircle className="w-3 h-3" />
                        Requires {getEmojiDisplay(currencyEmoji, 'w-3.5 h-3.5')}{formatNumber(item.required_balance)} minimum balance
                      </div>
                    )}
                    {isLoggedIn && missingRequiredRole && (
                      <div className="text-xs text-orange-500 mt-2 flex items-center gap-1.5">
                        <FiLock className="w-3 h-3" />
                        Requires any role: {item.role_required_names?.length ? item.role_required_names.join(', ') : 'Required role'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {}
        <div className="mt-10 text-center text-sm text-[rgb(var(--color-text-tertiary))] bg-[rgb(var(--color-bg-secondary))]/50 border border-[rgb(var(--color-border))] rounded-2xl p-4 backdrop-blur-sm">
          <p className="font-semibold text-[rgb(var(--color-text-primary))]">Omeglee Community Casino Economy</p>
          <p className="mt-1">Use redeem codes in Discord to claim your purchases</p>
        </div>
      </main>
    </div>
  );
}