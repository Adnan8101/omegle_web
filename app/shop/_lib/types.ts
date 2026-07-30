/** Wire shapes returned by /api/shop — unchanged from the previous Shop. */
export interface ShopItem {
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

export interface PendingPurchase {
  id: string;
  itemName: string;
  pricePaid: number;
  redeemCode: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface PurchaseResult {
  id: string;
  itemName: string;
  pricePaid: number;
  redeemCode: string;
  replyMessage: string | null;
  createdAt: string;
  expiresAt: string | null;
  dmSent?: boolean;
}

export interface ShopBudget {
  available: number;
  total_added: number;
  total_spent: number;
}

export type SortMode = 'default' | 'low' | 'high' | 'popular';

export const SORT_OPTIONS: { id: SortMode; label: string; short: string; hint: string }[] = [
  { id: 'default', label: 'Curated', short: 'Curated', hint: 'The order the team arranged the shelves in' },
  { id: 'popular', label: 'Most bought', short: 'Popular', hint: 'What members redeem the most' },
  { id: 'low', label: 'Price · low to high', short: 'Cheapest', hint: 'Start with what you can already afford' },
  { id: 'high', label: 'Price · high to low', short: 'Priciest', hint: 'The heavy hitters first' },
];

/**
 * Everything the UI needs to know about whether an item can be bought right
 * now. Centralised so the card, the confirm sheet and the page guard can never
 * disagree — the precedence order here is exactly the previous Shop's.
 */
export interface Availability {
  outOfStock: boolean;
  disabled: boolean;
  insufficientBudget: boolean;
  missingRole: boolean;
  canAfford: boolean;
  /** Item-side blockers: nothing the viewer can do about these. */
  unavailable: boolean;
  /** Buy button is inert. */
  blocked: boolean;
  cta: string;
  tone: 'buy' | 'signin' | 'dead' | 'warn' | 'poor';
  /** Days until the listing expires, when that's within a week. */
  daysLeft: number | null;
  stockLeft: number | null;
}

export function availabilityOf(
  item: ShopItem,
  ctx: { isLoggedIn: boolean; userBalance: number; budget: ShopBudget | null; purchasing: boolean }
): Availability {
  const { isLoggedIn, userBalance, budget, purchasing } = ctx;

  const outOfStock = Boolean(item.out_of_stock || (item.stock !== null && item.stock !== -1 && item.stock <= 0));
  const disabled = !item.enabled;
  const insufficientBudget = Boolean(budget && budget.available < item.price);
  const missingRole = Boolean(isLoggedIn && item.role_required_ids?.length > 0 && item.has_required_role === false);
  const canAfford = isLoggedIn ? userBalance >= item.price : true;
  const unavailable = outOfStock || disabled || insufficientBudget;
  const blocked = purchasing || unavailable || (isLoggedIn && (!canAfford || missingRole));

  const daysLeftRaw = item.expires_at
    ? Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  let cta = 'Buy';
  let tone: Availability['tone'] = 'buy';
  if (outOfStock) {
    cta = 'Sold out';
    tone = 'dead';
  } else if (disabled || insufficientBudget) {
    cta = 'Unavailable';
    tone = 'dead';
  } else if (missingRole) {
    cta = 'Role required';
    tone = 'warn';
  } else if (!isLoggedIn) {
    cta = 'Sign in to buy';
    tone = 'signin';
  } else if (!canAfford) {
    cta = 'Not enough';
    tone = 'poor';
  }

  return {
    outOfStock,
    disabled,
    insufficientBudget,
    missingRole,
    canAfford,
    unavailable,
    blocked,
    cta,
    tone,
    daysLeft: daysLeftRaw !== null && daysLeftRaw <= 7 ? daysLeftRaw : null,
    stockLeft: !outOfStock && item.stock !== null && item.stock !== -1 ? item.stock : null,
  };
}

export function sortItems(items: ShopItem[], mode: SortMode): ShopItem[] {
  return [...items].sort((a, b) => {
    if (mode === 'low') return a.price - b.price;
    if (mode === 'high') return b.price - a.price;
    if (mode === 'popular') return (b.purchase_count || 0) - (a.purchase_count || 0);
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export const formatNumber = (n: number) => n.toLocaleString();
