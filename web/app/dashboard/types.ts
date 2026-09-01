export interface FollowedTipster {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedPick {
  id: number;
  title: string;
  totalPicks: number;
  totalOdds: number;
  price: number;
  purchaseCount: number;
  status: string;
  result: string;
  picks: Array<{ matchDescription?: string; prediction?: string; odds?: number; matchDate?: string }>;
  tipster?: {
    id: number;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    winRate: number;
    totalPicks: number;
    wonPicks: number;
    lostPicks: number;
    rank: number | null;
    isAi?: boolean;
  } | null;
  createdAt: string;
  picksRevealed?: boolean;
  bookmakerKey?: string | null;
  bookingCode?: string | null;
  bookingCodeCopyCount?: number;
  reactionCount?: number;
  hasReacted?: boolean;
  commentCount?: number;
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

export interface Stats {
  users?: { total: number; tipsters: number };
  wallets?: { count: number; totalBalance: number };
  picks?: { total: number; pending: number; approved: number; activeMarketplace?: number; liveMarketplace?: number };
  escrow?: { held: number; heldPick?: number; heldSubscription?: number };
  purchases?: {
    total: number;
    revenue: number;
    marketplaceCount?: number;
    marketplaceRevenue?: number;
  };
  deposits?: { total: number; pending: number };
  withdrawals?: { total: number; pending: number };
}

export interface TipsterStats {
  totalPicks: number;
  wonPicks: number;
  lostPicks: number;
  winRate: number;
  totalEarnings: number;
  roi: number;
}

export interface Purchase {
  id: number;
  accumulatorId: number;
  purchasePrice: number;
  purchasedAt: string;
  pick?: {
    id: number;
    title: string;
    totalPicks: number;
    totalOdds: number;
    status: string;
    result: string;
  };
}

export interface PurchaseStats {
  total: number;
  totalSpent: number;
  active: number;
  pendingEscrowAmount: number;
}

export type DashboardSurface = 'buy' | 'sell';
