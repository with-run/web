import { create } from 'zustand';

import type { CreateRunningSessionResponse, CompleteRunningSessionResponse } from '@/apis/runningSessions';

interface GhostRunSessionStore {
  session: CreateRunningSessionResponse | null;
  result: CompleteRunningSessionResponse | null;
  setSession: (session: CreateRunningSessionResponse) => void;
  setResult: (result: CompleteRunningSessionResponse) => void;
  clearAll: () => void;
}

export const useGhostRunSessionStore = create<GhostRunSessionStore>((set) => ({
  session: null,
  result: null,
  setSession: (session) => set({ session }),
  setResult: (result) => set({ result }),
  clearAll: () => set({ session: null, result: null }),
}));
