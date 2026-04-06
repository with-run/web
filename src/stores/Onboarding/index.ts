import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { ONBOARDING_STORAGE_KEY } from '@/constants/Onboarding';

type OnboardingStore = {
  hasCompletedOnboarding: boolean;
  hasHydrated: boolean;
  markOnboardingCompleted: () => void;
  clearOnboardingCompletion: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

function normalizeLegacyOnboardingStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storedValue = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);

  if (storedValue !== 'true' && storedValue !== 'false') {
    return;
  }

  window.localStorage.setItem(
    ONBOARDING_STORAGE_KEY,
    JSON.stringify({
      state: { hasCompletedOnboarding: storedValue === 'true' },
      version: 0,
    }),
  );
}

normalizeLegacyOnboardingStorage();

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      hasHydrated: false,
      markOnboardingCompleted: () => set({ hasCompletedOnboarding: true }),
      clearOnboardingCompletion: () =>
        set({ hasCompletedOnboarding: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function hasCompletedOnboarding(): boolean {
  return useOnboardingStore.getState().hasCompletedOnboarding;
}

export function markOnboardingCompleted(): void {
  useOnboardingStore.getState().markOnboardingCompleted();
}

export function clearOnboardingCompletion(): void {
  useOnboardingStore.getState().clearOnboardingCompletion();
}
