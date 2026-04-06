import { create } from 'zustand';

import type { CreateRunningSessionResponse, CompleteRunningSessionResponse } from '@/apis/runningSessions';

interface NormalRunSessionStore {
  // createRunningSession 응답 (세션 시작 시 저장)
  session: CreateRunningSessionResponse | null;
  // completeRunningSession 응답 (세션 종료 시 저장)
  result: CompleteRunningSessionResponse | null;
  setSession: (session: CreateRunningSessionResponse) => void;
  setResult: (result: CompleteRunningSessionResponse) => void;
  clearAll: () => void;
}

export const useNormalRunSessionStore = create<NormalRunSessionStore>((set) => ({
  session: null,
  result: null,
  setSession: (session) => set({ session }),
  setResult: (result) => set({ result }),
  clearAll: () => set({ session: null, result: null }),
}));
