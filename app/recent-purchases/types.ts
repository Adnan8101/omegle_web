export interface PurchaseUser {
  displayName: string;
  username: string | null;
  avatar: string | null;
}

export interface RecentPurchase {
  id: string;
  itemName: string;
  itemDescription: string | null;
  itemThumbnail: string | null;
  itemDelisted: boolean;
  pricePaid: number;
  status: string;
  purchasedAt: string;
  user: PurchaseUser;
}

/** One day of the feed, newest day first. */
export interface DayGroup {
  key: string;
  label: string;
  rows: RecentPurchase[];
  spent: number;
}
