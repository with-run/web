// 라우터와 전역 스토어가 모두 같은 인증 상태 머신을 보도록 문자열 리터럴을 고정한다.
export type AuthStatus =
  | 'idle'
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated';

export type AuthGender = 'MALE' | 'FEMALE';

export type AuthUser = {
  userId: number;
  provider: string;
  profileCompleted: boolean;
  nickname: string | null;
  birthDate: string | null;
  gender: AuthGender | null;
  height: number | null;
  weight: number | null;
};

export type ReissueAccessTokenResponse = {
  accessToken: string;
  provider: string;
  profileCompleted: boolean;
};

// 모바일 OAuth 복귀 시 query string으로 전달된 교환 코드 요청 모델
export type ExchangeAuthCodeRequest = {
  code: string;
};

// 교환 성공 시 access token은 body로 받고, refresh cookie는 브라우저 저장소에 자동 반영된다.
export type ExchangeAuthCodeResponse = {
  accessToken: string;
};
