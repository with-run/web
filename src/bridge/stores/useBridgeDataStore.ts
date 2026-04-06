import { create } from 'zustand';
import type { GpsLocation, WatchHealthData } from '@bridge';

interface BridgeDataState {
  gpsLocation: GpsLocation | null;
  watchHealthData: WatchHealthData | null;
  // 마지막으로 워치 메시지를 받은 시각 (ms). 3초 초과 시 워치 연결 끊김으로 판단
  lastWatchMessageAt: number | null;
  setGpsLocation: (data: GpsLocation) => void;
  setWatchHealthData: (data: WatchHealthData) => void;
}

export const useBridgeDataStore = create<BridgeDataState>((set) => ({
  gpsLocation: null,
  watchHealthData: null,
  lastWatchMessageAt: null,
  setGpsLocation: (data) => set({ gpsLocation: data }),
  setWatchHealthData: (data) => set({ watchHealthData: data, lastWatchMessageAt: Date.now() }),
}));
