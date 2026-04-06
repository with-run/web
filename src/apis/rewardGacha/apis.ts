import axiosClient from '@/shared/libs/axiosClient';
import type { ApiResponse } from '../types';

import type {
  RewardGachaDrawResponse,
  RewardInventoryPageResponse,
  RewardItemShowcaseListResponse,
} from './types';

export async function getRewardShowcase(): Promise<
  ApiResponse<RewardItemShowcaseListResponse>
> {
  const { data } = await axiosClient.get<
    ApiResponse<RewardItemShowcaseListResponse>
  >('/reward-items/showcase');
  return data;
}

export async function drawRewardGacha(): Promise<
  ApiResponse<RewardGachaDrawResponse>
> {
  const { data } =
    await axiosClient.post<ApiResponse<RewardGachaDrawResponse>>(
      '/reward-gacha/draw'
    );
  return data;
}

export async function getRewardInventory(
  page: number = 0,
  size: number = 20
): Promise<ApiResponse<RewardInventoryPageResponse>> {
  const { data } = await axiosClient.get<
    ApiResponse<RewardInventoryPageResponse>
  >('/reward-gacha/me/inventory', {
    params: { page, size },
  });
  return data;
}
