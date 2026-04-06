import { type RouteObject } from 'react-router-dom';

import { AuthCallbackPage } from '@/pages/public/AuthCallback';
import { LoginPage } from '@/pages/public/Login';
import { OnboardingPage } from '@/pages/public/Onboarding';
import { OnboardingRoute, PublicOnlyRoute } from '@/routes/AuthGuards';
import { MainLayout } from '@/shared/layouts/MainLayout';
import ErrorPage from '../pages/public/ErrorPage';

export const publicRoutes: RouteObject[] = [
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <MainLayout fullScreen />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '*', element: <ErrorPage /> },
        ],
      },
    ],
  },
  {
    // /auth/callback: OAuth provider에서 돌아오는 transient 엔드포인트.
    // 인증 상태가 불확정이므로 가드 없이 단독 배치한다.
    element: <MainLayout fullScreen />,
    children: [{ path: '/auth/callback', element: <AuthCallbackPage /> }],
  },
  {
    element: <OnboardingRoute />,
    children: [
      {
        element: <MainLayout fullScreen />,
        children: [{ path: '/onboarding', element: <OnboardingPage /> }],
      },
    ],
  },
];
