import { type RouteObject } from 'react-router-dom';

import { CalendarPage } from '@/pages/private/CalendarPage';
import { CalendarDetailPage } from '@/pages/private/CalendarDetailPage';
import { FreeRunPage } from '@/pages/private/FreeRunPage';
import { FreeRunSessionPage } from '@/pages/private/FreeRunSessionPage';
import { HomePage } from '@/pages/private/home';
import { NormalRunPage } from '@/pages/private/NormalRun';
import { NormalRunDetailPage } from '@/pages/private/NormalRunDetail';
import { NormalRunSessionPage } from '@/pages/private/NormalRunSession';
import { ProfilePage } from '@/pages/private/profile';
import { RequireAuthRoute } from '@/routes/AuthGuards';
import { MainLayout } from '@/shared/layouts/MainLayout';
import { GhostRunPage } from '@/pages/private/GhostRun';
import { GhostRunDetailPage } from '@/pages/private/GhostRunDetail';
import { GhostRunSessionPage } from '@/pages/private/GhostRunSession';
import { RewardGachaPage } from '@/pages/private/RewardGachaPage';

export const privateRoutes: RouteObject[] = [
  {
    // private route 는 공통 auth guard 를 한 번만 거치고, 이후 레이아웃만 화면 종류에 따라 나눕니다.
    element: <RequireAuthRoute />,
    children: [
      {
        element: <MainLayout showTopNav showBottomNav />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/reward-gacha', element: <RewardGachaPage /> },
        ],
      },
      {
        element: <MainLayout showBottomNav fullScreen />,
        children: [
          { path: '/normal-run', element: <NormalRunPage /> },
          { path: '/normal-run/:courseId', element: <NormalRunDetailPage /> },
          { path: '/free-run', element: <FreeRunPage /> },
          { path: '/ghost-run', element: <GhostRunPage /> },
          { path: '/ghost-run/:courseId', element: <GhostRunDetailPage /> },
        ],
      },
      {
        element: <MainLayout fullScreen />,
        children: [
          { path: '/free-run-session', element: <FreeRunSessionPage /> },
          {
            path: '/ghost-run-session/:courseId',
            element: <GhostRunSessionPage />,
          },
          {
            path: '/normal-run-session/:courseId',
            element: <NormalRunSessionPage />,
          },
          {
            path: '/calendar/:runningSessionId',
            element: <CalendarDetailPage />,
          },
        ],
      },
    ],
  },
];
