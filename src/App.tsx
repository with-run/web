import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useBridgeSync } from '@/bridge';
import { useAuthBootstrap } from '@/hooks/Auth';
import { router } from './routes/routes';

function App() {
  // 브릿지 동기화와 세션 bootstrap 을 앱 루트에서 한 번만 시작해 모든 라우트가 같은 상태를 공유하게 한다.
  useBridgeSync();
  useAuthBootstrap();

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors />
    </>
  );
}

export default App;
