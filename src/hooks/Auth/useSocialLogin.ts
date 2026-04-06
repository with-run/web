import { useCallback } from 'react';

import {
  buildSocialLoginUrl,
  buildWebSocialLoginUrl,
  type SocialProvider,
} from '@/apis/auth';
import { bridge } from '@/bridge';

export function useSocialLogin(): (provider: SocialProvider) => Promise<void> {
  return useCallback(async (provider: SocialProvider) => {
    // 모바일일시 딥링크 로그인 분기 처리(브릿지로 모바일에게 로그인 작업 위임)
    if (bridge.isWebViewBridgeAvailable) {
      const authorizationUrl = buildSocialLoginUrl(provider);
      await bridge.startSocialLogin(authorizationUrl);
      return;
    }

    // 일반 웹에서 로그인 하는경우 웹에서 url 접속
    const authorizationUrl = buildWebSocialLoginUrl(provider);
    window.location.assign(authorizationUrl);
  }, []);
}
