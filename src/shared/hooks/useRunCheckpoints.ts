// 코스 체크포인트 순차 방문 추적 훅
// 책임: 코스 거리 기반 체크포인트 샘플링 → GPS 이동구간 crossing으로 순차 방문 감지

import { useEffect, useRef, useState } from 'react';

import type { CoordinatePoint } from '@/apis/course';
import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';
import { buildCumDist, metersPerDegLon, pointToPolylineM, projectOnRoute } from '@/shared/utils/geo';

const TARGET_CHECKPOINT_SPACING_M = 300;
const MIN_CHECKPOINT_SPACING_M = 80;
const MAX_CHECKPOINTS = 15;

const GATE_HALF_WIDTH_M = 20;
const FORWARD_PASS_RANGE_M = 10;
const FALLBACK_PASS_MARGIN_M = 10;

const FALLBACK_ROUTE_RADIUS_M = 30;

const BACKTRACK_TOLERANCE_M = 8;
const MIN_PROGRESS_FOR_CHECK_M = 1;
const LOCAL_WINDOW_SEGMENTS = 2;

type GateLine = {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
};

export type Checkpoint = {
  latitude: number;
  longitude: number;
  /** 체크포인트가 위치한 코스 누적 거리(m) */
  routeDistM: number;
  /** 이탈 감지용 slice 시작 인덱스 (이 체크포인트까지 왔으면 이후 구간만 감지) */
  coordIdx: number;
  gate: GateLine;
  visited: boolean;
};

function resolveCheckpointCount(totalDistM: number): number {
  if (totalDistM <= 0) return 0;
  if (totalDistM < MIN_CHECKPOINT_SPACING_M) return 1;

  const estimated = Math.round(totalDistM / TARGET_CHECKPOINT_SPACING_M) + 1;
  return Math.max(2, Math.min(MAX_CHECKPOINTS, estimated));
}

function buildGateLine(
  cpLat: number,
  cpLng: number,
  dirX: number,
  dirY: number
): GateLine {
  const mPerDegLat = 110_540;
  const mPerDegLon = metersPerDegLon(cpLat);

  const nx = -dirY;
  const ny = dirX;

  const startLat = cpLat + (ny * GATE_HALF_WIDTH_M) / mPerDegLat;
  const startLng = cpLng + (nx * GATE_HALF_WIDTH_M) / mPerDegLon;
  const endLat = cpLat - (ny * GATE_HALF_WIDTH_M) / mPerDegLat;
  const endLng = cpLng - (nx * GATE_HALF_WIDTH_M) / mPerDegLon;

  return {
    startLatitude: startLat,
    startLongitude: startLng,
    endLatitude: endLat,
    endLongitude: endLng,
  };
}

function normalizeDirection(dx: number, dy: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

/** 루트 좌표 배열의 coordIdx 지점 접선 방향 반환 (게이트 직각 계산용) */
function resolveRouteDirectionAtIdx(
  coords: CoordinatePoint[],
  coordIdx: number
): { x: number; y: number } {
  const mPerDegLat = 110_540;

  if (coordIdx + 1 < coords.length) {
    const cur = coords[coordIdx];
    const next = coords[coordIdx + 1];
    return normalizeDirection(
      (next.longitude - cur.longitude) * metersPerDegLon(cur.latitude),
      (next.latitude - cur.latitude) * mPerDegLat
    );
  }

  if (coordIdx > 0) {
    const prev = coords[coordIdx - 1];
    const cur = coords[coordIdx];
    return normalizeDirection(
      (cur.longitude - prev.longitude) * metersPerDegLon(prev.latitude),
      (cur.latitude - prev.latitude) * mPerDegLat
    );
  }

  return { x: 1, y: 0 };
}

function buildCheckpoints(coords: CoordinatePoint[], cumDist: number[]): Checkpoint[] {
  if (coords.length < 2) return [];

  const totalDist = cumDist[cumDist.length - 1] ?? 0;
  const checkpointCount = resolveCheckpointCount(totalDist);
  if (checkpointCount <= 0) return [];

  const checkpointsBase: Array<
    Omit<Checkpoint, 'gate'> & { gateDir: { x: number; y: number } }
  > = [];

  for (let step = 1; step <= checkpointCount; step++) {
    // 마지막 체크포인트는 정확히 종점
    const targetDist = step === checkpointCount ? totalDist : (totalDist * step) / checkpointCount;

    let lo = 0;
    let hi = cumDist.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (cumDist[mid] <= targetDist) lo = mid;
      else hi = mid;
    }

    const segLen = cumDist[hi] - cumDist[lo];
    const t = segLen > 0 ? (targetDist - cumDist[lo]) / segLen : 0;

    const latitude = coords[lo].latitude + t * (coords[hi].latitude - coords[lo].latitude);
    const longitude = coords[lo].longitude + t * (coords[hi].longitude - coords[lo].longitude);

    const segDir = normalizeDirection(
      (coords[hi].longitude - coords[lo].longitude) * metersPerDegLon(latitude),
      (coords[hi].latitude - coords[lo].latitude) * 110_540
    );

    checkpointsBase.push({
      latitude,
      longitude,
      routeDistM: targetDist,
      coordIdx: hi,
      visited: false,
      gateDir: segDir,
    });
  }

  const checkpoints: Checkpoint[] = checkpointsBase.map((cp) => {
    return {
      latitude: cp.latitude,
      longitude: cp.longitude,
      routeDistM: cp.routeDistM,
      coordIdx: cp.coordIdx,
      visited: cp.visited,
      gate: buildGateLine(cp.latitude, cp.longitude, cp.gateDir.x, cp.gateDir.y),
    };
  });

  return checkpoints;
}

function buildLocalRouteWindow(coords: CoordinatePoint[], coordIdx: number): CoordinatePoint[] {
  const from = Math.max(0, coordIdx - LOCAL_WINDOW_SEGMENTS);
  const to = Math.min(coords.length - 1, coordIdx + LOCAL_WINDOW_SEGMENTS);
  return coords.slice(from, to + 1);
}

export function useRunCheckpoints(
  coordinates: CoordinatePoint[],
  isPaused: boolean
): {
  checkpoints: Checkpoint[];
  nextCheckpointIdx: number;
  lastVisitedCoordIdx: number;
  allVisited: boolean;
  visitedCount: number;
} {
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  const cumDistRef = useRef<number[]>([]);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const nextCheckpointIdxRef = useRef(0);
  const prevRouteDistRef = useRef<number | null>(null);

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [nextCheckpointIdx, setNextCheckpointIdx] = useState(0);

  // 좌표 변경 시 체크포인트 초기화
  useEffect(() => {
    if (coordinates.length < 2) {
      cumDistRef.current = [];
      checkpointsRef.current = [];
      nextCheckpointIdxRef.current = 0;
      prevRouteDistRef.current = null;
      setCheckpoints([]);
      setNextCheckpointIdx(0);
      return;
    }

    const cumDist = buildCumDist(coordinates);
    const cps = buildCheckpoints(coordinates, cumDist);

    cumDistRef.current = cumDist;
    checkpointsRef.current = cps;
    nextCheckpointIdxRef.current = 0;
    prevRouteDistRef.current = null;

    setCheckpoints(cps.map((cp) => ({ ...cp })));
    setNextCheckpointIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates]);

  // GPS 갱신 시 다음 체크포인트 방문 판정 (crossing + fallback 구제)
  useEffect(() => {
    if (!gpsLocation || isPaused || coordinates.length < 2 || cumDistRef.current.length === 0) return;

    const cps = checkpointsRef.current;
    const nextIdx = nextCheckpointIdxRef.current;
    if (nextIdx >= cps.length) return;

    const rawCurrRouteDist = projectOnRoute(
      gpsLocation.latitude,
      gpsLocation.longitude,
      coordinates,
      cumDistRef.current
    );

    const prevRouteDist = prevRouteDistRef.current;
    if (prevRouteDist === null) {
      prevRouteDistRef.current = rawCurrRouteDist;
      return;
    }

    const currRouteDist =
      rawCurrRouteDist + BACKTRACK_TOLERANCE_M < prevRouteDist
        ? prevRouteDist
        : rawCurrRouteDist;
    const progressed = currRouteDist - prevRouteDist;

    const next = cps[nextIdx];
    const localRoute = buildLocalRouteWindow(coordinates, next.coordIdx);
    const crossTrackM = pointToPolylineM(
      gpsLocation.latitude,
      gpsLocation.longitude,
      localRoute
    );

    const dir = resolveRouteDirectionAtIdx(coordinates, next.coordIdx);
    const mPerDegLat = 110_540;
    const mPerDegLon = metersPerDegLon(next.latitude);
    const relX = (gpsLocation.longitude - next.longitude) * mPerDegLon;
    const relY = (gpsLocation.latitude - next.latitude) * mPerDegLat;
    const forwardM = relX * dir.x + relY * dir.y;
    const lateralM = Math.abs(relX * -dir.y + relY * dir.x);

    const enteredForwardGateZone =
      forwardM >= 0 &&
      forwardM <= FORWARD_PASS_RANGE_M &&
      lateralM <= GATE_HALF_WIDTH_M;

    const fallbackPassed =
      progressed >= MIN_PROGRESS_FOR_CHECK_M &&
      currRouteDist >= next.routeDistM + FALLBACK_PASS_MARGIN_M &&
      crossTrackM <= FALLBACK_ROUTE_RADIUS_M;

    const canVisitByGate = enteredForwardGateZone;

    if (canVisitByGate || fallbackPassed) {
      const updated = cps.map((cp, i) => (i === nextIdx ? { ...cp, visited: true } : cp));
      checkpointsRef.current = updated;
      nextCheckpointIdxRef.current = nextIdx + 1;
      setCheckpoints(updated);
      setNextCheckpointIdx(nextIdx + 1);
    }

    prevRouteDistRef.current = currRouteDist;
  }, [coordinates, gpsLocation, isPaused]);

  const visitedCount = checkpoints.filter((cp) => cp.visited).length;
  const allVisited = checkpoints.length > 0 && visitedCount === checkpoints.length;
  const lastVisitedCoordIdx = visitedCount > 0 ? checkpoints[visitedCount - 1].coordIdx : 0;

  return {
    checkpoints,
    nextCheckpointIdx,
    lastVisitedCoordIdx,
    allVisited,
    visitedCount,
  };
}
