import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { logout } from '@/apis/auth';
import { useAuthStore } from '@/stores/Auth';

export function useLogout() {
  const navigate = useNavigate();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await logout(accessToken);
    } catch {
      toast.error('로그아웃 처리 중 오류가 있었지만 세션은 정리할게요.');
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }
  }

  return { handleLogout, isLoggingOut };
}
