// 러닝 헬스 샘플 수집 훅 (FreeRun / NormalRun 공용)
// 책임: 워치 연결 감지 + 헬스 샘플 수집 + 구간 심박수 추적

import { useState, useEffect, useRef } from 'react';

import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';
import type { HealthSample } from '@/apis/runningSessions';

// 워치 메시지가 이 시간(ms) 이상 오지 않으면 연결 끊김으로 판단
const WATCH_TIMEOUT_MS = 3000;

export function useRunningHealth({ isPaused }: { isPaused: boolean }) {
  const [isWatchConnected, setIsWatchConnected] = useState(false);

  const healthSamplesRef = useRef<HealthSample[]>([]);
  const currentKmHeartRatesRef = useRef<number[]>([]);
  const lastGpsReceivedAtRef = useRef<number | null>(null);

  // latest-ref 패턴: isPaused/gpsLocation/isWatchConnected 변경 시 effect 재실행 없이 최신값 읽기
  const latestIsPausedRef = useRef(isPaused);
  const latestIsWatchConnectedRef = useRef(isWatchConnected);

  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);
  const watchHealthData = useBridgeDataStore((s) => s.watchHealthData);
  const lastWatchMessageAt = useBridgeDataStore((s) => s.lastWatchMessageAt);

  const latestGpsLocationRef = useRef(gpsLocation);

  useEffect(() => {
    // 최신 paused 상태를 effect 로 밀어넣어 watchHealthData 수신 effect 에서는 ref 만 읽도록 유지한다.
    latestIsPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    // 워치 연결 여부도 ref 로 넘겨야 health sample 수집 effect 가 불필요하게 재실행되지 않는다.
    latestIsWatchConnectedRef.current = isWatchConnected;
  }, [isWatchConnected]);

  useEffect(() => {
    // GPS 스냅샷은 심박 샘플 수집 시점에 함께 참조하므로 별도 ref 로 최신값만 보관한다.
    latestGpsLocationRef.current = gpsLocation;
  }, [gpsLocation]);

  // 워치 연결 상태 1초마다 체크
  useEffect(() => {
    const check = () => {
      const connected =
        lastWatchMessageAt !== null &&
        Date.now() - lastWatchMessageAt < WATCH_TIMEOUT_MS;
      setIsWatchConnected(connected);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [lastWatchMessageAt]);

  // GPS 수신 시각 추적 (GPS stale 판단용)
  useEffect(() => {
    if (!gpsLocation) return;
    lastGpsReceivedAtRef.current = Date.now();
  }, [gpsLocation]);

  // 헬스 샘플 누적 + 구간 심박수 추적
  // isPaused를 dep에서 제외(ref로 읽기): isPaused 변경 시 재실행으로 인한 중복 샘플 방지
  useEffect(() => {
    if (latestIsPausedRef.current || !watchHealthData) return;

    healthSamplesRef.current.push({
      sampledAt: new Date(watchHealthData.timestamp).toISOString(),
      heartRate: watchHealthData.heartRate,
      caloriesKcal: watchHealthData.caloriesKcal,
    });

    if (watchHealthData.heartRate > 0) {
      currentKmHeartRatesRef.current.push(watchHealthData.heartRate);
    }
  }, [watchHealthData]);

  return {
    isWatchConnected,
    watchHealthData,
    healthSamplesRef,
    currentKmHeartRatesRef,
  };
}
