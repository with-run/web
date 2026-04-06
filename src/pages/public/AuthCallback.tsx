import { AuthCallbackScreen } from '@/features/Auth/AuthCallbackScreen';

export function AuthCallbackPage() {
  // 라우터는 shared callback 화면만 연결하고, 세션 복구 로직은 feature 안에서 처리합니다.
  return <AuthCallbackScreen />;
}
