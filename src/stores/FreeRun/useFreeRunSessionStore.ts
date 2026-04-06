import { create } from 'zustand';
import type { CreateRunningSessionResponse, CompleteRunningSessionResponse } from '@/apis/runningSessions';

interface FreeRunSessionStore {
  session: CreateRunningSessionResponse | null;
  result: CompleteRunningSessionResponse | null;
  setSession: (session: CreateRunningSessionResponse) => void;
  setResult: (result: CompleteRunningSessionResponse) => void;
  clearAll: () => void;
}

export const useFreeRunSessionStore = create<FreeRunSessionStore>((set) => ({
  session: null,
  result: null,
  setSession: (session) => set({ session, result: null }),
  setResult: (result) => set({ result }),
  clearAll: () => set({ session: null, result: null }),
}));
