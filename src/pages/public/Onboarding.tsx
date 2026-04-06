import { OnboardingScreen } from '@/features/Onboarding';

export function OnboardingPage() {
  // pages는 라우트와 연결만 맡고, 실제 화면 구조는 feature에서 관리한다.
  return <OnboardingScreen />;
}
