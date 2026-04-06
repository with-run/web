import { NavLink } from 'react-router-dom';
import { Calendar, Ghost, Home, Map, Navigation } from 'lucide-react';

const ITEMS = [
  { label: '홈', to: '/home', icon: Home },
  { label: '자유', to: '/free-run', icon: Navigation },
  { label: '일반', to: '/normal-run', icon: Map },
  { label: '고스트', to: '/ghost-run', icon: Ghost },
  { label: '캘린더', to: '/calendar', icon: Calendar },
];

// key는 리액트가 내부적으로 구분하려고 씀
// to는 라우터가 페이지 이동하려고 씀
// NavLink 안에 요소가 2개 들어가야 한다 (아이콘용 태그 + 텍스트용 태그)

// 하단 네비게이션 높이 상수
export const BOTTOM_NAV_HEIGHT = 80;

export function BottomNavigation() {
  return (
    <div className="fixed bottom-0 left-0 z-modal flex w-full pointer-events-none">
      <div
        style={{ height: BOTTOM_NAV_HEIGHT }}
        className="pointer-events-auto mx-auto flex w-full min-w-[375px] max-w-[430px] border-t border-border-default bg-surface-default px-6 py-2 shadow-soft-lg"
      >
        <nav className="flex-1 flex items-center justify-between">
          {ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-1"
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={
                        isActive
                          ? 'rounded-full bg-primary-5 p-2 text-primary-2 shadow-sm'
                          : 'rounded-full p-2 text-fg-secondary transition-colors'
                      }
                    >
                      <Icon className="w-full" />
                    </div>
                    <span
                      className={
                        isActive
                          ? 'text-xs font-semibold text-primary-2'
                          : 'text-xs text-fg-secondary'
                      }
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
