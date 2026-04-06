import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/Auth';

export function EntryPage() {
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const profileCompleted = user?.profileCompleted;

  if (status === 'idle' || status === 'bootstrapping') {
    // 새로고침 직후에도 마지막 사용자 스냅샷이 남아 있으면,
    // entry 에서 불필요하게 로딩에 묶지 말고 바로 목적지로 보낸다.
    if (user !== null) {
      return (
        <Navigate
          to={profileCompleted ? '/home' : '/onboarding'}
          replace
        />
      );
    }

    if (accessToken) {
      // access token 만 남아 있고 사용자 스냅샷이 비어 있는 케이스에서만
      // bootstrap 결과를 기다리며 짧은 로딩을 보여준다.
      return (
          <div className="flex min-h-screen items-center justify-center bg-surface-subtle px-6 text-center text-fg-primary">
    <div className="space-y-4 rounded-2xl border border-border-default bg-surface-default px-8 py-10 shadow-lg">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-border-default border-t-primary-1" />
      <p className="body-r text-fg-secondary">처리 중입니다...</p>
    </div>
  </div>

      );
    }

    return <Navigate to="/login" replace />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={profileCompleted ? '/home' : '/onboarding'}
      replace
    />
  );
}
