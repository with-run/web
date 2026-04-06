import { ProfileScreen } from '@/features/Profile';

export function ProfilePage() {
  // page 레이어는 라우터 연결만 맡고 실제 화면 구성은 feature 로 위임합니다.
  return <ProfileScreen />;
}
