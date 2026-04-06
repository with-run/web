import type { ApiResponse } from '../types';

import axiosClient from '@/shared/libs/axiosClient';
import type {
  NicknameAvailabilityResponse,
  UpdateUserProfileRequest,
  UserProfileResponse,
} from './types';

export async function getUserProfile(): Promise<UserProfileResponse> {
  // 프로필 화면 진입 시 store 의 캐시보다 서버 값을 한 번 더 읽어 최신 상태로 맞춘다.
  const { data } =
    await axiosClient.get<ApiResponse<UserProfileResponse>>('/users/me');

  return data.data;
}

export async function updateUserProfile(
  payload: UpdateUserProfileRequest
): Promise<void> {
  await axiosClient.put<ApiResponse<void>>('/users/me', payload);
}

export async function deleteUserProfile(): Promise<void> {
  // 회원탈퇴는 현재 로그인 사용자 기준 soft delete 이므로 별도 id 없이 /users/me 로 호출한다.
  await axiosClient.delete<ApiResponse<void>>('/users/me');
}

export async function checkNicknameAvailability(
  nickname: string
): Promise<NicknameAvailabilityResponse> {
  const { data } = await axiosClient.get<
    ApiResponse<NicknameAvailabilityResponse>
  >('/users/nickname-availability', { params: { nickname } });

  return data.data;
}
