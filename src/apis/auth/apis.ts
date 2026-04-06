import type { ApiResponse } from '../types';

import { buildServerUrl } from '@/shared/config/api';
import { authApiClient } from '@/shared/libs/axiosClient';
import type {
  AuthUser,
  ExchangeAuthCodeRequest,
  ExchangeAuthCodeResponse,
  ReissueAccessTokenResponse,
} from './types';

export type SocialProvider = 'kakao' | 'google';

export async function reissueAccessToken(): Promise<ReissueAccessTokenResponse> {
  const { data } =
    await authApiClient.post<ApiResponse<ReissueAccessTokenResponse>>(
      '/auth/reissue'
    );

  return data.data;
}

export async function exchangeAuthCode(
  request: ExchangeAuthCodeRequest
): Promise<ExchangeAuthCodeResponse> {
  // 모바일 OAuth 복귀 직후에는 refresh cookie가 없을 수 있으므로 code를 먼저 세션으로 교환합니다.
  const { data } = await authApiClient.post<
    ApiResponse<ExchangeAuthCodeResponse>
  >('/auth/exchange', request);

  return data.data;
}

export async function getCurrentUser(accessToken: string): Promise<AuthUser> {
  // /auth/me 는 bootstrap 중 "이 토큰이 실제로 누구인지"를 확정하는 마지막 단계다.
  const { data } = await authApiClient.get<ApiResponse<AuthUser>>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data.data;
}

export async function logout(accessToken: string | null): Promise<void> {
  await authApiClient.post<ApiResponse<void>>(
    '/auth/logout',
    undefined,
    accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined
  );
}

export function buildSocialLoginUrl(provider: SocialProvider): string {
  // 웹과 모바일이 모두 같은 백엔드 OAuth 진입점 규칙을 공유한다.
  return buildServerUrl(`/oauth2/authorization/${provider}`);
}

export function buildWebSocialLoginUrl(provider: SocialProvider): string {
  // 현재 웹 origin 을 함께 넘겨야 백엔드가 OAuth 완료 후 같은 도메인의 callback 으로 돌려보낼 수 있다.
  const origin = encodeURIComponent(window.location.origin);

  return buildServerUrl(
    `/web/oauth2/authorization/${provider}?origin=${origin}`
  );
}
