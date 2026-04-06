import axiosClient from '@/shared/libs/axiosClient';
import type { ApiResponse } from '../types';

import type {
  RewardPointBalanceResponse,
  RewardPointHistoryPageResponse,
} from './types';

export async function getRewardPointBalance(): Promise<
  ApiResponse<RewardPointBalanceResponse>
> {
  const { data } =
    await axiosClient.get<ApiResponse<RewardPointBalanceResponse>>(
      '/reward-points/me'
    );

  return data;
}

export async function getRewardPointHistories(
  page: number = 0,
  size: number = 20
): Promise<ApiResponse<RewardPointHistoryPageResponse>> {
  const { data } = await axiosClient.get<
    ApiResponse<RewardPointHistoryPageResponse>
  >('/reward-points/me/histories', {
    params: { page, size },
  });

  return data;
}
