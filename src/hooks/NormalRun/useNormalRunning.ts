// NormalRun 세션 오케스트레이터 훅
// 책임: 서브 훅 조합 + 표시값 계산 + 세션 데이터 최종 종합(getCollectedData)
//
// 훅 간 결합도 = 0: 서브 훅끼리는 서로 import하지 않음
// 수직 결합(이 훅 → 서브 훅)만 존재
//
// 데이터 우선순위:
//   워치 연결 중 → 워치(Samsung Health) 데이터 우선
//   워치 미연결/끊김 → 모바일(GPS + 가속도계) 폴백

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';

import { useRunningTimer } from '@/shared/hooks/Running/useRunningTimer';
import { useRunningGps } from '@/shared/hooks/Running/useRunningGps';
import { useRunningHealth } from '@/shared/hooks/Running/useRunningHealth';
import { useRunningSplits } from '@/shared/hooks/Running/useRunningSplits';
import { useNormalRunCourseDeviation } from './useNormalRunCourseDeviation';
import { useRunCheckpoints } from '@/shared/hooks/useRunCheckpoints';
export type { Checkpoint } from '@/shared/hooks/useRunCheckpoints';
import {
  nearestPointOnPolyline,
  haversineM,
  buildCumDist,
  projectOnRoute,
} from '@/shared/utils/geo';
import type { CoordinatePoint } from '@/apis/course';

interface UseNormalRunningParams {
  courseCoordinates: CoordinatePoint[];
  onForceStop: () => void;
  onDestinationReached?: () => void;
}

export function useNormalRunning({
  courseCoordinates,
  onForceStop,
  onDestinationReached,
}: UseNormalRunningParams) {
  const [startupCountdownSec, setStartupCountdownSec] = useState(3);
  const isStartupCountdown = startupCountdownSec > 0;

  const {
    durationSec,
    formattedTime,
    isPaused,
    isEffectivelyPaused,
    togglePause,
  } = useRunningTimer({
    forcedPaused: isStartupCountdown,
  });

  useEffect(() => {
    if (!isStartupCountdown) return;

    const timerId = setTimeout(() => {
      setStartupCountdownSec((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [isStartupCountdown, startupCountdownSec]);

  const togglePauseWithCountdownGuard = useCallback(() => {
    if (isStartupCountdown) return;
    togglePause();
  }, [isStartupCountdown, togglePause]);

  const {
    checkpoints,
    nextCheckpointIdx,
    lastVisitedCoordIdx,
    allVisited,
    visitedCount,
  } = useRunCheckpoints(courseCoordinates, isEffectivelyPaused);

  const { isDeviating, deviationSec, deviationAnchor } =
    useNormalRunCourseDeviation({
      courseCoordinates,
      isPaused: isEffectivelyPaused,
      onForceStop,
      lastCheckpointCoordIdx: lastVisitedCoordIdx,
    });

  // 이탈 중에도 데이터 수집 중단 (코스 데이터 오염 방지)
  const shouldPauseCollection = isEffectivelyPaused || isDeviating;

  const { haversineDistanceKm, elevationGainMRef, gpsSamplesRef } =
    useRunningGps({ isPaused: shouldPauseCollection });

  const {
    isWatchConnected,
    watchHealthData,
    healthSamplesRef,
    currentKmHeartRatesRef,
  } = useRunningHealth({ isPaused: shouldPauseCollection });

  // 표시값 계산용: GPS Doppler 속도·케이던스 (데이터 수집은 GPS 훅에서 담당)
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  // distanceKm: 워치 연결 시 워치 데이터 우선, 미연결 시 Haversine 폴백
  const distanceKm =
    isWatchConnected && watchHealthData && watchHealthData.distanceM > 0
      ? watchHealthData.distanceM / 1000
      : haversineDistanceKm;

  const { splitsRef } = useRunningSplits({
    distanceKm,
    durationSec,
    isPaused: shouldPauseCollection,
    elevationGainMRef,
    currentKmHeartRatesRef,
  });

  // ── 일시정지 앵커 (재개 잠금) ──────────────────────────────────────
  // 일시정지 진입 시 가장 가까운 코스 지점을 고정 → 해당 지점 30m 내에서만 재개 가능
  const [pauseAnchor, setPauseAnchor] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // latest ref 패턴: useEffect dep 최소화
  const latestGpsRef = useRef(gpsLocation);
  latestGpsRef.current = gpsLocation;
  const prevIsPausedRef = useRef(false);

  useEffect(() => {
    const wasPaused = prevIsPausedRef.current;
    prevIsPausedRef.current = isPaused;

    if (!wasPaused && isPaused) {
      // 일시정지 진입 → 현재 GPS 기준 코스 앵커 설정
      const gps = latestGpsRef.current;
      if (gps) {
        setPauseAnchor(
          nearestPointOnPolyline(gps.latitude, gps.longitude, courseCoordinates)
        );
      }
    } else if (wasPaused && !isPaused) {
      // 재개 → 앵커 해제
      setPauseAnchor(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]); // isPaused 전환 시만 실행

  // 재개 가능 여부: 앵커 없음 또는 앵커 30m 이내
  const isWithinPauseAnchor =
    !pauseAnchor ||
    !gpsLocation ||
    haversineM(
      gpsLocation.latitude,
      gpsLocation.longitude,
      pauseAnchor.latitude,
      pauseAnchor.longitude
    ) <= 30;

  // ── 표시값 계산 ────────────────────────────────────────────────

  const speedMps = gpsLocation?.speedMps ?? 0;

  const pace =
    speedMps > 0.5
      ? (() => {
          const secPerKm = 1000 / speedMps;
          const mins = Math.floor(secPerKm / 60);
          const secs = Math.floor(secPerKm % 60);
          return `${mins}'${String(secs).padStart(2, '0')}"`;
        })()
      : `--'--"`;

  const calories = Math.round(watchHealthData?.caloriesKcal ?? 0);
  const heartRate = watchHealthData?.heartRate ?? 0;

  const cadenceSpm = isWatchConnected
    ? (watchHealthData?.cadenceSpm ?? gpsLocation?.cadenceSpm ?? 0)
    : (gpsLocation?.cadenceSpm ?? 0);

  const routeCumDist = useMemo(
    () => buildCumDist(courseCoordinates),
    [courseCoordinates]
  );
  const totalRouteDistanceM = routeCumDist[routeCumDist.length - 1] ?? 0;
  const routeProgressM = gpsLocation
    ? projectOnRoute(
        gpsLocation.latitude,
        gpsLocation.longitude,
        courseCoordinates,
        routeCumDist
      )
    : 0;

  // 목적지 도달(모든 체크포인트 방문) → onDestinationReached 1회 호출
  const onDestinationReachedRef = useRef(onDestinationReached);
  onDestinationReachedRef.current = onDestinationReached;
  const destinationCalledRef = useRef(false);

  useEffect(() => {
    if (allVisited && !destinationCalledRef.current) {
      destinationCalledRef.current = true;
      onDestinationReachedRef.current?.();
    }
  }, [allVisited]);

  // 세션 종료 시 호출 — 수집된 샘플 배열과 종합 통계를 반환
  const getCollectedData = useCallback(() => {
    const distanceM = Math.round(distanceKm * 1000);
    const avgSpeedMps = durationSec > 0 ? distanceM / durationSec : 0;
    const avgPaceSecPerKm =
      distanceKm > 0 ? Math.round(durationSec / distanceKm) : 0;

    return {
      durationSec,
      distanceM,
      avgSpeedMps: parseFloat(avgSpeedMps.toFixed(2)),
      avgPaceSecPerKm,
      caloriesKcal: calories,
      elevationGainM: Math.round(elevationGainMRef.current),
      gpsSamples: gpsSamplesRef.current,
      healthSamples: healthSamplesRef.current,
      splits: splitsRef.current,
    };
  }, [
    durationSec,
    distanceKm,
    calories,
    elevationGainMRef,
    gpsSamplesRef,
    healthSamplesRef,
    splitsRef,
  ]);

  return {
    time: formattedTime,
    durationSec,
    distance: distanceKm.toFixed(2),
    pace,
    calories,
    heartRate,
    cadenceSpm,
    routeProgressM,
    totalRouteDistanceM,
    isWatchConnected,
    isPaused,
    isEffectivelyPaused,
    togglePause: togglePauseWithCountdownGuard,
    getCollectedData,
    isDeviating,
    deviationSec,
    deviationAnchor,
    pauseAnchor,
    checkpoints,
    nextCheckpointIdx,
    allCheckpointsVisited: allVisited,
    visitedCount,
    isWithinPauseAnchor,
    isStartupCountdown,
    startupCountdownSec,
  };
}
