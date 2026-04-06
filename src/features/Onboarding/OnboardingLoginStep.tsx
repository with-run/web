import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { SocialProvider } from '@/apis/auth';
import { useSocialLogin } from '@/hooks/Auth';
import { ONBOARDING_LOGIN_COPY_TEXTS } from '@/constants/Onboarding';

type LoginErrorCode = 'cancelled' | 'access_denied' | 'server_error';

type OnboardingLoginStepProps = {
  error: string | null;
};

const LOGIN_ERROR_MESSAGES: Record<LoginErrorCode, string> = {
  cancelled: '로그인이 취소되었어요. 다시 연결해볼까요?',
  access_denied: '권한 동의가 필요해서 로그인을 완료하지 못했어요.',
  server_error: '로그인 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
};

function resolveLoginError(error: string | null): LoginErrorCode | null {
  if (!error) {
    return null;
  }

  if (
    error === 'cancelled' ||
    error === 'access_denied' ||
    error === 'server_error'
  ) {
    return error;
  }

  return 'server_error';
}

export function OnboardingLoginStep({ error }: OnboardingLoginStepProps) {
  const [copyIndex, setCopyIndex] = useState(0);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null
  );
  const startSocialLogin = useSocialLogin();
  const loginError = useMemo(() => resolveLoginError(error), [error]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCopyIndex(
        (currentIndex) =>
          (currentIndex + 1) % ONBOARDING_LOGIN_COPY_TEXTS.length
      );
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function handleLogin(provider: SocialProvider) {
    setPendingProvider(provider);

    try {
      await startSocialLogin(provider);
    } catch {
      setPendingProvider(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -36 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="absolute bottom-0 z-20 flex min-h-[21rem] w-full flex-col items-center justify-between rounded-t-[2rem] border-t border-white/50 bg-white/80 px-6 pb-8 pt-8 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl"
    >
      <div className="mb-6 mt-6 w-full text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
          With Run
        </h1>
        <div className="mt-2 flex h-8 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={copyIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm font-medium text-gray-700"
            >
              {ONBOARDING_LOGIN_COPY_TEXTS[copyIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {loginError ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-left text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={16} />
            <p>{LOGIN_ERROR_MESSAGES[loginError]}</p>
          </motion.div>
        ) : null}
      </div>

      <div className="w-full space-y-3">
        {/* Kakao Login Button */}
        <button
          type="button"
          onClick={() => void handleLogin('kakao')}
          disabled={pendingProvider !== null}
          className="relative flex w-full items-center justify-center rounded-xl bg-[#FEE500] py-[14px] text-base font-medium text-[#000000] shadow-sm transition-all hover:bg-[#FEE500]/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingProvider === 'kakao' ? (
            <LoaderCircle
              size={20}
              className="absolute left-5 animate-spin text-black"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="absolute left-5 h-6 w-6 text-black"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 3c-5.523 0-10 3.866-10 8.635 0 3.09 1.954 5.795 4.908 7.306L5.64 23.36c-.056.24.195.421.411.309l5.053-3.414c.29.022.587.034.896.034 5.523 0 10-3.865 10-8.634C22 6.866 17.523 3 12 3z" />
            </svg>
          )}
          <span>Kakao로 시작하기</span>
        </button>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={() => void handleLogin('google')}
          disabled={pendingProvider !== null}
          className="font-['Roboto',sans-serif] relative flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white py-[14px] text-base font-medium text-[#444444] shadow-sm transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendingProvider === 'google' ? (
            <LoaderCircle
              size={20}
              className="absolute left-5 animate-spin text-gray-500"
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="absolute left-[22px] h-[20px] w-[20px]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
          )}
          <span>Google로 시작하기</span>
        </button>
      </div>
    </motion.div>
  );
}
