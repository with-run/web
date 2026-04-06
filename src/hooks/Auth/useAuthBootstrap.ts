import { useEffect } from 'react';

import { useAuthStore } from '@/stores/Auth';
import { bootstrapAuthSession } from '@/utils/auth/bootstrapAuthSession';

function isAuthCallbackPath(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname === '/auth/callback';
}

export function useAuthBootstrap(): void {
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    // callback 화면은 자체적으로 세션 복구를 수행하므로 전역 bootstrap 과 중복 실행하지 않는다.
    if (status !== 'idle' || isAuthCallbackPath()) {
      return;
    }

    let isCancelled = false;

    bootstrapAuth();

    void (async () => {
      try {
        const session = await bootstrapAuthSession(accessToken);

        if (isCancelled) {
          return;
        }

        setAuthenticated(session);
      } catch {
        if (isCancelled) {
          return;
        }

        clearAuth();
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [accessToken, bootstrapAuth, clearAuth, setAuthenticated, status]);
}
