import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useLogout } from '@/hooks/Auth';
import { OnboardingBackground } from './OnboardingBackground';
import { OnboardingCharacter } from './OnboardingCharacter';
import { OnboardingFormStep } from './OnboardingFormStep';

export function OnboardingScreen() {
  const navigate = useNavigate();
  const { handleLogout, isLoggingOut } = useLogout();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#A9D179]">
      <div className="absolute inset-0 z-0">
        <OnboardingBackground isMoving />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <OnboardingCharacter state="form" />
      </div>

      <button
        type="button"
        onClick={() => void handleLogout()}
        disabled={isLoggingOut}
        aria-label="로그아웃"
        className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/30 disabled:opacity-50"
      >
        <LogOut size={18} />
      </button>

      <OnboardingFormStep
        onComplete={() => navigate('/home', { replace: true })}
      />
    </div>
  );
}
