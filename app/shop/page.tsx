'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  FiShoppingCart, FiDollarSign, FiPackage, FiClock, FiCheck,
  FiX, FiCopy, FiRefreshCw, FiLock, FiAlertCircle
} from 'react-icons/fi';

interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  thumbnail: string | null;
  stock: number | null;
  income_amount: number | null;
  time_hours: number | null;
  role_required_id: string | null;
  required_balance: number | null;
  expires_at: string | null;
}

interface PendingPurchase {
  id: string;
  itemName: string;
  pricePaid: number;
  redeemCode: string;
  createdAt: string;
}

interface PurchaseResult {
  id: string;
  itemName: string;
  pricePaid: number;
  redeemCode: string;
  replyMessage: string | null;
  createdAt: string;
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

  // Authentication check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/admin');
      return;
    }
  }, [status, router]);

  // Show login page if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center p-6">
        <div className="glass-blue rounded-3xl p-10 border border-[rgb(var(--color-border))] shadow-apple-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="p-5 bg-blue-500/10 rounded-full border border-blue-500/30 inline-block">
              <FiLock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">
                Shop Access Required
              </h2>
              <p className="text-[rgb(var(--color-text-secondary))]">
                Please sign in with Discord to access the shop
              </p>
            </div>
            <button
              onClick={() => signIn('discord')}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
              </svg>
              Sign in with Discord
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-[rgb(var(--color-text-secondary))]">Loading shop...</p>
        </div>
      </div>
    );
  }

  // Convert Discord emoji format to CDN URL
  const getEmojiDisplay = (emoji: string, size: string = 'w-6 h-6') => {
    // Check if it's a Discord custom emoji like <a:name:id> or <:name:id>
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
    // Return regular emoji
    return <span className="text-xl">{emoji}</span>;
  };


  useEffect(() => {
    fetchShop();
  }, [session]);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shop');
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
        setCurrencyEmoji(data.config?.currencyEmoji || '🪙');
        setCurrencyName(data.config?.currencyName || 'Ozy');

        if (data.user) {
          setUserBalance(data.user.balance || 0);
          setPendingPurchases(data.user.pendingPurchases || []);
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
      signIn('discord');
      return;
    }

    if (userBalance < item.price) {
      setError(`Insufficient balance. You need ${item.price.toLocaleString()} ${currencyName} but only have ${userBalance.toLocaleString()} ${currencyName}.`);
      return;
    }

    // Show confirmation modal
    setConfirmItem(item);
  };

  const confirmPurchase = async () => {
    if (!confirmItem) return;
    
    const item = confirmItem;
    setConfirmItem(null);
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

      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      setPurchaseResult({
        ...data.purchase,
        dmSent: data.dmSent
      });
      setUserBalance(data.newBalance);
      
      // Refresh shop to update stock
      fetchShop();

    } catch (err: any) {
      setError(err.message || 'Failed to purchase item');
    } finally {
      setPurchasing(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatNumber = (n: number) => n.toLocaleString();

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

  return (
    <div className="min-h-screen bg-[rgb(var(--color-bg-primary))]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgb(var(--color-bg-secondary))]/80 backdrop-blur-xl border-b border-[rgb(var(--color-border))]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/Main_logo_omegle-ezgif.com-video-to-gif-converter-2.gif"
                alt="Logo"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[rgb(var(--color-text-primary))]">Omeglee Shop</h1>
              <p className="text-xs text-[rgb(var(--color-text-tertiary))]">Casino Economy Store</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <>
                {/* Balance */}
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  {getEmojiDisplay(currencyEmoji)}
                  <span className="font-bold text-yellow-500">{formatNumber(userBalance)}</span>
                  <span className="text-xs text-yellow-500/70">{currencyName}</span>
                </div>

                {/* My Purchases Link */}
                <Link
                  href="/purchases"
                  className="relative p-2 rounded-xl bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] transition-colors"
                  title="My Purchases"
                >
                  <FiShoppingCart className="w-5 h-5" />
                  {pendingPurchases.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-black text-xs font-bold rounded-full flex items-center justify-center">
                      {pendingPurchases.length}
                    </span>
                  )}
                </Link>

                {/* User */}
                <div className="flex items-center gap-2">
                  <img
                    src={session.user?.image || `https://cdn.discordapp.com/embed/avatars/0.png`}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-[rgb(var(--color-text-secondary))] hidden md:block">
                    {session.user?.name}
                  </span>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" />
                </svg>
                Login with Discord
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Confirmation Modal */}
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

              {/* Item Preview */}
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

              {/* Balance Summary */}
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

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmItem(null)}
                  className="flex-1 px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPurchase}
                  className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold"
                >
                  Confirm Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Result Modal */}
      {purchaseResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                <FiCheck className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-[rgb(var(--color-text-primary))] mb-2">Purchase Successful!</h3>
              <p className="text-[rgb(var(--color-text-secondary))] mb-4 flex items-center justify-center gap-1.5 flex-wrap">
                You purchased <strong>{purchaseResult.itemName}</strong> for 
                {getEmojiDisplay(currencyEmoji, 'w-5 h-5')}
                <strong>{formatNumber(purchaseResult.pricePaid)}</strong>
              </p>

              {/* Redeem Code */}
              <div className="p-4 bg-[rgb(var(--color-bg-tertiary))] rounded-xl mb-4">
                <p className="text-xs text-[rgb(var(--color-text-tertiary))] mb-2">Your Redeem Code</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-2xl font-mono font-bold text-yellow-500 tracking-wider">
                    {purchaseResult.redeemCode}
                  </code>
                  <button
                    onClick={() => copyCode(purchaseResult.redeemCode)}
                    className="p-2 rounded-lg hover:bg-[rgb(var(--color-hover))] transition-colors"
                  >
                    {copiedCode === purchaseResult.redeemCode ? (
                      <FiCheck className="w-5 h-5 text-green-500" />
                    ) : (
                      <FiCopy className="w-5 h-5 text-[rgb(var(--color-text-tertiary))]" />
                    )}
                  </button>
                </div>
              </div>

              {purchaseResult.replyMessage && (
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4 p-3 bg-[rgb(var(--color-bg-tertiary))] rounded-xl">
                  {purchaseResult.replyMessage.replace(/<@\d+>/g, '')}
                </p>
              )}

              {/* DM Status */}
              {purchaseResult.dmSent ? (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl mb-4 flex items-center gap-2">
                  <FiCheck className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">Receipt sent to your Discord DMs!</span>
                </div>
              ) : (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4 flex items-center gap-2">
                  <FiAlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-500">Could not DM you. Make sure your DMs are open!</span>
                </div>
              )}

              {/* Redeem Instructions */}
              <div className="p-4 bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl mb-4 text-left">
                <p className="text-sm font-medium text-[rgb(var(--color-text-primary))] mb-2">📩 How to Redeem:</p>
                <ol className="text-sm text-[rgb(var(--color-text-secondary))] space-y-1 list-decimal list-inside">
                  <li>DM <span className="text-[#5865F2] font-semibold">Omeglee Bot</span> to open a ticket</li>
                  <li>Select <span className="font-semibold">Casino</span> category</li>
                  <li>Send your code: <code className="bg-[rgb(var(--color-bg-tertiary))] px-1.5 py-0.5 rounded text-yellow-500 font-mono">{purchaseResult.redeemCode}</code></li>
                </ol>
              </div>

              <button
                onClick={() => setPurchaseResult(null)}
                className="w-full px-4 py-3 bg-[rgb(var(--color-bg-tertiary))] hover:bg-[rgb(var(--color-hover))] rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Purchases Dropdown */}
      {showPurchases && pendingPurchases.length > 0 && (
        <div className="fixed top-20 right-4 z-40 w-80 bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))] shadow-xl">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 shadow-xl">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-500">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-400">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Banner */}
        {!session && (
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
            <FiLock className="w-5 h-5 text-blue-500" />
            <p className="text-[rgb(var(--color-text-secondary))]">
              Login with Discord to view your balance and make purchases
            </p>
          </div>
        )}

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="text-center py-20">
            <FiPackage className="w-16 h-16 mx-auto text-[rgb(var(--color-text-tertiary))] mb-4" />
            <h2 className="text-xl font-semibold text-[rgb(var(--color-text-primary))] mb-2">No Items Available</h2>
            <p className="text-[rgb(var(--color-text-secondary))]">Check back later for new items!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const canAfford = session ? userBalance >= item.price : false;
              const daysLeft = item.expires_at
                ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={item.id}
                  className="bg-[rgb(var(--color-bg-secondary))] rounded-2xl border border-[rgb(var(--color-border))] overflow-hidden hover:border-yellow-500/30 transition-all hover:shadow-lg hover:shadow-yellow-500/10"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-[rgb(var(--color-bg-tertiary))] relative overflow-hidden">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="w-full h-full object-cover object-center"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="w-16 h-16 text-[rgb(var(--color-text-tertiary))]" />
                      </div>
                    )}

                    {/* Stock Badge */}
                    {item.stock !== null && (
                      <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold ${
                        item.stock === 0 ? 'bg-red-500/90 text-white' : 
                        item.stock <= 5 ? 'bg-orange-500/90 text-white' : 
                        'bg-[rgb(var(--color-bg-secondary))]/90 text-[rgb(var(--color-text-primary))]'
                      }`}>
                        {item.stock === 0 ? 'Sold Out' : `${item.stock} left`}
                      </div>
                    )}

                    {/* Expiry Badge */}
                    {daysLeft !== null && daysLeft <= 7 && (
                      <div className="absolute top-3 left-3 px-2 py-1 bg-red-500/90 rounded-lg text-xs font-semibold text-white flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {daysLeft}d left
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-[rgb(var(--color-text-primary))] mb-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-3 line-clamp-2">{item.description}</p>
                    )}

                    {/* Income Info */}
                    {item.income_amount && item.time_hours && (
                      <div className="text-xs text-green-500 mb-3 flex items-center gap-1.5">
                        <FiDollarSign className="w-3 h-3" />
                        +{getEmojiDisplay(currencyEmoji, 'w-3.5 h-3.5')}
                        {formatNumber(item.income_amount)} every {item.time_hours}h
                      </div>
                    )}

                    {/* Price & Buy */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {getEmojiDisplay(currencyEmoji)}
                        <span className="text-xl font-bold text-[rgb(var(--color-text-primary))]">
                          {formatNumber(item.price)}
                        </span>
                      </div>

                      <button
                        onClick={() => handlePurchase(item)}
                        disabled={purchasing === item.id || (session && !canAfford) || item.stock === 0}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
                          !session
                            ? 'bg-[#5865F2] hover:bg-[#4752C4] text-white'
                            : canAfford && item.stock !== 0
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            : 'bg-[rgb(var(--color-bg-tertiary))] text-[rgb(var(--color-text-tertiary))] cursor-not-allowed'
                        }`}
                      >
                        {purchasing === item.id ? (
                          <FiRefreshCw className="w-4 h-4 animate-spin" />
                        ) : !session ? (
                          'Login'
                        ) : item.stock === 0 ? (
                          'Sold Out'
                        ) : canAfford ? (
                          'Buy'
                        ) : (
                          'Not Enough'
                        )}
                      </button>
                    </div>

                    {/* Min Balance Warning */}
                    {session && item.required_balance && userBalance < item.required_balance && (
                      <div className="text-xs text-orange-500 mt-2 flex items-center gap-1.5">
                        <FiAlertCircle className="w-3 h-3" />
                        Requires {getEmojiDisplay(currencyEmoji, 'w-3.5 h-3.5')}{formatNumber(item.required_balance)} minimum balance
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--color-border))] py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-[rgb(var(--color-text-tertiary))]">
          <p>Omeglee Community Casino Economy</p>
          <p className="mt-1">Use redeem codes in Discord to claim your purchases</p>
        </div>
      </footer>
    </div>
  );
}
