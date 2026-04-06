import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuthStore } from '@/stores/Auth';
import { bootstrapAuthSession } from '@/utils/auth/bootstrapAuthSession';

export function AuthCallbackScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    const error = searchParams.get('error');
    const authCode = searchParams.get('code');

    if (error) {
      clearAuth();
      navigate(`/login?error=${encodeURIComponent(error)}`, {
        replace: true,
      });
      return;
    }

    let isCancelled = false;

    bootstrapAuth();

    void (async () => {
      try {
        // 모바일은 code 교환, 웹은 refresh cookie 재발급으로 같은 callback 화면에서 세션을 복구한다.
        const session = await bootstrapAuthSession(undefined, authCode);

        if (isCancelled) {
          return;
        }

        setAuthenticated(session);
        navigate(session.user.profileCompleted ? '/home' : '/onboarding', {
          replace: true,
        });
      } catch {
        if (isCancelled) {
          return;
        }

        clearAuth();
        navigate('/login?error=server_error', { replace: true });
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [bootstrapAuth, clearAuth, navigate, searchParams, setAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-6 text-center text-fg-primary">
      <div className="space-y-4 rounded-2xl border border-border-default bg-surface-default px-8 py-10 shadow-lg">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-border-default border-t-primary-1" />
        <p className="body-r text-fg-secondary">
          처리 중입니다...
        </p>
      </div>
    </div>
  );
}
