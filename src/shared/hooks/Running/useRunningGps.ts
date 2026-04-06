// 러닝 GPS 샘플 수집 훅 (FreeRun / NormalRun 공용)
// 책임: GPS 샘플 수집 + Haversine 거리 누적 + 고도 상승 계산

import { useState, useEffect, useRef } from 'react';

import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';
import type { GpsSample } from '@/apis/runningSessions';
import { haversineKm } from '@/shared/utils';

// GPS 노이즈 필터 기준
const GPS_NOISE_MIN_KM = 0.002; // 2m 미만 → 정지 노이즈
const GPS_NOISE_MAX_KM = 0.05;  // 50m 초과 → GPS 점프

export function useRunningGps({ isPaused }: { isPaused: boolean }) {
  const [haversineDistanceKm, setHaversineDistanceKm] = useState(0);

  const prevGpsRef = useRef<{ lat: number; lon: number } | null>(null);
  const prevAltitudeRef = useRef<number | null>(null);
  const elevationGainMRef = useRef(0);
  const gpsSamplesRef = useRef<GpsSample[]>([]);

  // latest-ref 패턴: isPaused 변경 시 effect 재실행 없이 최신값 읽기
  const latestIsPausedRef = useRef(isPaused);
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  useEffect(() => {
    // render 중 ref 값을 직접 바꾸지 않고 effect 에서 동기화해 React Compiler 경고 가능성을 줄인다.
    latestIsPausedRef.current = isPaused;
  }, [isPaused]);

  // 일시정지 해제 시 이전 GPS 좌표 초기화 (재개 시 점프 방지)
  useEffect(() => {
    if (!isPaused) {
      prevGpsRef.current = null;
    }
  }, [isPaused]);

  // GPS 거리 누적 + 고도 상승 + 샘플 수집
  // isPaused를 dep에서 제외(ref로 읽기): isPaused 변경 시 재실행으로 인한 중복 샘플 방지
  useEffect(() => {
    if (latestIsPausedRef.current || !gpsLocation) return;

    const { latitude: lat, longitude: lon } = gpsLocation;

    if (prevGpsRef.current) {
      const delta = haversineKm(prevGpsRef.current.lat, prevGpsRef.current.lon, lat, lon);
      if (delta > GPS_NOISE_MIN_KM && delta < GPS_NOISE_MAX_KM) {
        setHaversineDistanceKm((prev) => prev + delta);
      }
    }
    prevGpsRef.current = { lat, lon };

    // 고도 누적 상승
    const altitude = gpsLocation.altitude ?? null;
    if (altitude !== null && prevAltitudeRef.current !== null) {
      const altDelta = altitude - prevAltitudeRef.current;
      if (altDelta > 0) {
        elevationGainMRef.current += altDelta;
      }
    }
    prevAltitudeRef.current = altitude;

    // GPS 샘플 누적 (세션 종료 시 서버 전송용)
    gpsSamplesRef.current.push({
      latitude: gpsLocation.latitude,
      longitude: gpsLocation.longitude,
      altitudeM: gpsLocation.altitude ?? 0,
      accuracyM: gpsLocation.accuracy ?? 0,
      bearingDeg: gpsLocation.heading ?? 0,
      sampledAt: new Date().toISOString(),
    });
  }, [gpsLocation]);

  return {
    haversineDistanceKm,
    elevationGainMRef,
    gpsSamplesRef,
  };
}
