import { Outlet } from 'react-router-dom';

import { BottomNavigation } from '../components';
import TopNavigation from '../components/TopNavigation/TopNavigation';
import { cn } from '../utils';

export function MainLayout({
  showTopNav = false,
  showBottomNav = false,
  fullScreen = false,
}: {
  showTopNav?: boolean;
  showBottomNav?: boolean;
  fullScreen?: boolean;
}) {
  return (
    <div
      className={
        'relative mx-auto flex h-dvh min-w-[375px] max-w-[430px] items-center justify-center bg-surface-subtle'
      }
    >
      <div className="flex h-dvh w-full flex-col overflow-hidden border-x border-border-default bg-surface-default shadow-soft-xl">
        {showTopNav && <TopNavigation />}

        <main
          className={cn(
            'flex-1 min-h-0 overflow-y-overlay bg-surface-subtle p-5',
            fullScreen && 'bg-transparent p-0'
          )}
        >
          <Outlet />
        </main>

        {showBottomNav && <BottomNavigation />}
      </div>
    </div>
  );
}
