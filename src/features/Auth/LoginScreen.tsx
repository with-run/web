import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ONBOARDING_INTRO_DURATION_MS } from '@/constants/Onboarding';
import { OnboardingBackground } from '@/features/Onboarding/OnboardingBackground';
import { OnboardingCharacter } from '@/features/Onboarding/OnboardingCharacter';
import { OnboardingIntro } from '@/features/Onboarding/OnboardingIntro';
import { OnboardingLoginStep } from '@/features/Onboarding/OnboardingLoginStep';
import { useAuthStore } from '@/stores/Auth';

type LoginPhase = 'intro' | 'login';

function resolveInitialPhase(
  hasAccessToken: boolean,
  hasLoginError: boolean,
): LoginPhase {
  // 토큰이 있거나 로그인 에러가 있으면 intro 스킵 - 사용자가 이미 시도한 상태
  if (hasAccessToken || hasLoginError) {
    return 'login';
  }

  return 'intro';
}

export function LoginScreen() {
  const [searchParams] = useSearchParams();
  const accessToken = useAuthStore((state) => state.accessToken);
  const loginError = searchParams.get('error');

  const [phase, setPhase] = useState<LoginPhase>(() =>
    resolveInitialPhase(accessToken !== null, loginError !== null),
  );

  useEffect(() => {
    if (phase === 'login') {
      return;
    }

    // intro 는 한 번만 자동 재생하고, 이후에는 login 단계로 전환한다.
    const timeoutId = window.setTimeout(() => {
      setPhase('login');
    }, ONBOARDING_INTRO_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#A9D179]">
      <AnimatePresence>
        {phase !== 'intro' ? (
          <motion.div
            key="login-shell"
            initial={{ clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ clipPath: 'circle(150% at 50% 50%)' }}
            transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-10 overflow-hidden"
          >
            <div className="absolute inset-0 z-0">
              <OnboardingBackground isMoving />
            </div>

            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <OnboardingCharacter state="login" />
            </div>

            <AnimatePresence mode="wait">
              {phase === 'login' ? (
                <OnboardingLoginStep key="login-step" error={loginError} />
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'intro' ? <OnboardingIntro /> : null}
      </AnimatePresence>
    </div>
  );
}
