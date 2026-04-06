export type RewardGachaCardType = 'MISS' | 'REWARD';

export interface RewardItemShowcaseResponse {
  rewardItemId: number;
  title: string;
  imageUrl: string;
}

export interface RewardItemShowcaseListResponse {
  items: RewardItemShowcaseResponse[];
}

export interface RewardGachaDrawCardResponse {
  rewardGachaDrawCardId: number;
  cardIndex: number;
  cardType: RewardGachaCardType;
  rewardItemId: number | null;
  title: string | null;
  imageUrl: string | null;
}

export interface RewardGachaDrawResponse {
  rewardGachaDrawId: number;
  spentPoint: number;
  remainingBalance: number;
  cards: RewardGachaDrawCardResponse[];
  createdAt: string;
}

export interface RewardInventoryItemResponse {
  rewardGachaDrawCardId: number;
  rewardGachaDrawId: number;
  rewardItemId: number;
  title: string;
  imageUrl: string;
  acquiredAt: string;
}

export interface RewardInventoryPageResponse {
  items: RewardInventoryItemResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}
