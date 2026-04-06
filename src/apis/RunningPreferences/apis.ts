import type { ApiResponse } from '../types';

import axiosClient from '@/shared/libs/axiosClient';
import type {
  UpdateUserRunningPreferenceRequest,
  UserRunningPreferenceResponse,
} from './types';

export async function getUserRunningPreferences(): Promise<UserRunningPreferenceResponse> {
  // 홈과 온보딩이 같은 API 계약을 바라보게 해서 값 매핑이 한곳에서만 유지되게 한다.
  const { data } = await axiosClient.get<
    ApiResponse<UserRunningPreferenceResponse>
  >('/users/me/running-preferences');

  return data.data;
}

export async function updateUserRunningPreferences(
  payload: UpdateUserRunningPreferenceRequest
): Promise<void> {
  await axiosClient.put<ApiResponse<void>>(
    '/users/me/running-preferences',
    payload
  );
}
