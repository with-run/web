import type { AuthGender } from '@/apis/auth';

// 마이페이지 수정 모달은 백엔드 DTO 와 같은 shape 을 그대로 사용한다.
export type UserProfileResponse = {
  nickname: string | null;
  birthDate: string | null;
  gender: AuthGender | null;
  height: number | null;
  weight: number | null;
};

export type UpdateUserProfileRequest = {
  nickname: string;
  birthDate: string;
  gender: AuthGender;
  height: number;
  weight: number;
};

export type NicknameAvailabilityResponse = {
  available: boolean;
};
