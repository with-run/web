import {
  exchangeAuthCode,
  getCurrentUser,
  reissueAccessToken,
  type AuthUser,
} from '@/apis/auth';

export type BootstrapAuthSessionResult = {
  accessToken: string;
  user: AuthUser;
};

export async function bootstrapAuthSession(
  fallbackAccessToken?: string | null,
  authCode?: string | null,
): Promise<BootstrapAuthSessionResult> {
  try {
    // 모바일은 code 교환을 우선하고, 일반 웹은 기존 refresh cookie 재발급 흐름을 그대로 사용합니다.
    const authResponse = authCode
      ? await exchangeAuthCode({ code: authCode })
      : await reissueAccessToken();
    const user = await getCurrentUser(authResponse.accessToken);

    return {
      accessToken: authResponse.accessToken,
      user,
    };
  } catch (reissueError) {
    if (!fallbackAccessToken) {
      throw reissueError;
    }

    // 이미 저장된 access token 이 아직 유효한 경우에는 쿠키 재발급 실패여도 사용자 복구를 한 번 더 시도한다.
    const user = await getCurrentUser(fallbackAccessToken);

    return {
      accessToken: fallbackAccessToken,
      user,
    };
  }
}
