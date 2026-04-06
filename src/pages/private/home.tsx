import { HomeScreen } from '@/features/Home';

export function HomePage() {
  // 홈 route 는 feature 컴포넌트만 연결하고 레이아웃 책임은 MainLayout 에 둡니다.
  return <HomeScreen />;
}
