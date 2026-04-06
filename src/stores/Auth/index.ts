import { create } from 'zustand';

import type { AuthStatus, AuthUser } from '@/apis/auth';

export const AUTH_STORAGE_KEY = 'withrun:auth';

type PersistedAuthState = {
  accessToken: string | null;
  user: AuthUser | null;
};

type SetAuthenticatedInput = {
  accessToken: string;
  user: AuthUser;
};

type AuthStore = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  bootstrapAuth: () => void;
  setAuthenticated: (payload: SetAuthenticatedInput) => void;
  setAccessToken: (accessToken: string | null) => void;
  updateUser: (user: AuthUser) => void;
  clearAuth: () => void;
};

function readPersistedAuthState(): PersistedAuthState {
  if (typeof window === 'undefined') {
    return { accessToken: null, user: null };
  }

  const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedValue) {
    return { accessToken: null, user: null };
  }

  try {
    const parsedValue = JSON.parse(storedValue) as PersistedAuthState;

    return {
      accessToken: parsedValue.accessToken ?? null,
      user: parsedValue.user ?? null,
    };
  } catch {
    return { accessToken: null, user: null };
  }
}

function persistAuthState(state: PersistedAuthState): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state.accessToken && !state.user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

const persistedAuthState = readPersistedAuthState();

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'idle',
  accessToken: persistedAuthState.accessToken,
  user: persistedAuthState.user,
  bootstrapAuth: () => {
    // 앱 시작 직후 "세션 확인 중" 상태를 명시해서 가드가 섣불리 로그아웃 분기를 타지 않게 한다.
    set({ status: 'bootstrapping' });
  },
  setAuthenticated: ({ accessToken, user }) => {
    persistAuthState({ accessToken, user });
    set({
      status: 'authenticated',
      accessToken,
      user,
    });
  },
  setAccessToken: (accessToken) => {
    const user = get().user;
    persistAuthState({ accessToken, user });
    set({ accessToken });
  },
  updateUser: (user) => {
    const accessToken = get().accessToken;
    persistAuthState({ accessToken, user });
    set({
      status: 'authenticated',
      user,
    });
  },
  clearAuth: () => {
    persistAuthState({ accessToken: null, user: null });
    set({
      status: 'unauthenticated',
      accessToken: null,
      user: null,
    });
  },
}));
