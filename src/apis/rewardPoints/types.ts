export type RewardPointReason =
  | 'DAILY_RUNNING'
  | 'WEEKLY_STREAK_3_DAYS'
  | 'WEEKLY_STREAK_5_DAYS'
  | 'WEEKLY_STREAK_7_DAYS'
  | 'GHOST_WIN'
  | 'GACHA_DRAW';

export type RewardPointBalanceResponse = {
  currentBalance: number;
};

export type RewardPointHistoryItem = {
  rewardPointHistoryId: number;
  deltaPoint: number;
  reason: RewardPointReason;
  idempotencyKey: string;
  createdAt: string;
};

export type RewardPointHistoryPageResponse = {
  items: RewardPointHistoryItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};
