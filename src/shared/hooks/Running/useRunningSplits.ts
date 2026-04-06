// 러닝 1km 구간(split) 감지 훅 (FreeRun / NormalRun 공용)
// 책임: 거리 기반 1km 완주 감지 → SplitRecord 누적

import { useEffect, useRef } from 'react';

import type { SplitRecord } from '@/apis/runningSessions';

interface UseRunningSplitsParams {
  distanceKm: number;
  durationSec: number;
  isPaused: boolean;
  elevationGainMRef: React.MutableRefObject<number>;
  currentKmHeartRatesRef: React.MutableRefObject<number[]>;
}

export function useRunningSplits({
  distanceKm,
  durationSec,
  isPaused,
  elevationGainMRef,
  currentKmHeartRatesRef,
}: UseRunningSplitsParams) {
  const splitsRef = useRef<SplitRecord[]>([]);
  const lastSplitKmRef = useRef(0);
  const lastSplitTimeRef = useRef(0);
  const lastSplitElevationRef = useRef(0);

  // 1km 구간 완주 감지 → split 기록
  useEffect(() => {
    if (isPaused) return;
    const targetKm = Math.floor(distanceKm);
    if (targetKm <= lastSplitKmRef.current) return;

    for (let km = lastSplitKmRef.current + 1; km <= targetKm; km++) {
      const splitDurationSec = durationSec - lastSplitTimeRef.current;
      const splitElevGain = Math.round(
        elevationGainMRef.current - lastSplitElevationRef.current
      );
      const hrs = currentKmHeartRatesRef.current;
      const avgHeartRate =
        hrs.length > 0
          ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
          : 0;

      splitsRef.current.push({
        splitIndex: km,
        splitDistanceM: 1000,
        splitDurationSec,
        splitPaceSecPerKm: splitDurationSec, // 1km 구간이므로 duration = pace
        avgHeartRate,
        elevationGainM: splitElevGain,
      });

      lastSplitTimeRef.current = durationSec;
      lastSplitElevationRef.current = elevationGainMRef.current;
      currentKmHeartRatesRef.current = [];
    }
    lastSplitKmRef.current = targetKm;
  }, [
    distanceKm,
    durationSec,
    isPaused,
    elevationGainMRef,
    currentKmHeartRatesRef,
  ]);

  return { splitsRef };
}
