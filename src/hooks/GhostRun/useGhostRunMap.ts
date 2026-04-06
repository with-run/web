import { useEffect, useRef } from 'react';

import type { CoordinatePoint, RouteType } from '@/apis';
import type { Checkpoint } from '@/shared/hooks/useRunCheckpoints';
import { useRunLocation } from '@/shared/hooks/useRunLocation';
import { buildCumDist } from '@/shared/utils/geo';
import {
  M_PER_DEG_LAT,
  M_PER_DEG_LON_EQUATOR,
  MAP_DEFAULT_CENTER,
  MAP_LERP,
  ROUTE_ARROW_COUNT,
} from '@/shared/constants/map';
import { loadKakaoMapSdk } from '@/shared/libs';
import {
  createCheckpointDotContent,
  createGhostMarkerContent,
  createNextGatePolyline,
  createRouteArrowElement,
  createRoutePolyline,
  createSafeZoneCircle,
  createUserMarkerContent,
  createVisitedPolyline,
} from '@/shared/kakaoMap';
import { lerpAngle } from '@/shared/utils';

/** 누적 거리 배열에서 targetDist 위치의 lat/lng 보간 */
function interpolateAlongRoute(
  coords: CoordinatePoint[],
  cumDist: number[],
  totalDist: number,
  targetDist: number
): { lat: number; lng: number } {
  if (targetDist >= totalDist) {
    const last = coords[coords.length - 1];
    return { lat: last.latitude, lng: last.longitude };
  }

  // 이분 탐색으로 세그먼트 찾기
  let lo = 0;
  let hi = cumDist.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (cumDist[mid] <= targetDist) lo = mid;
    else hi = mid;
  }

  const segLen = cumDist[hi] - cumDist[lo];
  const t = segLen > 0 ? (targetDist - cumDist[lo]) / segLen : 0;

  return {
    lat: coords[lo].latitude + t * (coords[hi].latitude - coords[lo].latitude),
    lng:
      coords[lo].longitude + t * (coords[hi].longitude - coords[lo].longitude),
  };
}

export function useGhostRunMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  params: {
    coordinates: CoordinatePoint[];
    routeType?: RouteType;
    courseAnchor: { latitude: number; longitude: number } | null;
    ghostDurationSec: number;
    isPaused: boolean;
    ghostDistanceMRef?: React.MutableRefObject<number>;
    onGhostFinished?: () => void;
    checkpoints?: Checkpoint[];
    visitedCount?: number;
    nextCheckpointIdx?: number;
  }
): void {
  const { location } = useRunLocation();
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const userDotRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const ghostDotRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const safeZoneCircleRef = useRef<kakao.maps.Circle | null>(null);
  const visitedPolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const remainingPolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const checkpointOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const nextGatePolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const routeArrowOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const ghostFinishedRef = useRef(false);
  const onGhostFinishedRef = useRef(params.onGhostFinished);
  onGhostFinishedRef.current = params.onGhostFinished;

  const animStateRef = useRef({
    rafId: null as number | null,
    currentLat: 0,
    currentLng: 0,
    targetLat: 0,
    targetLng: 0,
    currentHeading: 0,
    targetHeading: null as number | null,
    targetSpeed: null as number | null,
    initialized: false,
    coneEl: null as HTMLElement | null,
  });

  const ghostStateRef = useRef({
    startMs: 0,
    totalPausedMs: 0,
    pauseStartMs: 0,
    isPaused: false,
    cumDist: [] as number[],
    totalDist: 0,
    coords: [] as CoordinatePoint[],
  });

  // 지도 초기화 + 폴리라인 + 사용자 마커 + 고스트 마커 + RAF 루프
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { coordinates, ghostDurationSec } = params;
    const hasGhost = ghostDurationSec > 0 && coordinates.length >= 2;

    let cancelled = false;

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled) return;
        console.log(
          '[GhostRunMap] SDK loaded. ghostDurationSec:',
          ghostDurationSec,
          'hasGhost:',
          hasGhost,
          'coords:',
          coordinates.length
        );

        const center = new kakao.maps.LatLng(
          MAP_DEFAULT_CENTER.lat,
          MAP_DEFAULT_CENTER.lng
        );
        mapRef.current = new kakao.maps.Map(container, { center, level: 5 });

        // 폴리라인 (잔여 파란색 + 방문 녹색 오버레이)
        if (coordinates.length > 0) {
          const path = coordinates.map(
            (c) => new kakao.maps.LatLng(c.latitude, c.longitude)
          );

          remainingPolylineRef.current = createRoutePolyline(path);
          remainingPolylineRef.current.setMap(mapRef.current);

          visitedPolylineRef.current = createVisitedPolyline([]);
          visitedPolylineRef.current.setMap(mapRef.current);

          // 진행 방향 화살표 오버레이 (OUT_AND_BACK은 전반부에만 배치)
          const arrowCoords =
            params.routeType === 'OUT_AND_BACK'
              ? coordinates.slice(0, Math.ceil(coordinates.length / 2))
              : coordinates;
          const step = Math.max(
            1,
            Math.floor(arrowCoords.length / ROUTE_ARROW_COUNT)
          );
          const startOffset = Math.floor(step / 2);
          for (let i = startOffset; i < arrowCoords.length - 1; i += step) {
            const cur = arrowCoords[i];
            const next = arrowCoords[Math.min(i + 1, arrowCoords.length - 1)];
            const dx =
              (next.longitude - cur.longitude) *
              Math.cos((cur.latitude * Math.PI) / 180) *
              M_PER_DEG_LON_EQUATOR;
            const dy = (next.latitude - cur.latitude) * M_PER_DEG_LAT;
            const bearingDeg = Math.atan2(dx, dy) * (180 / Math.PI);
            routeArrowOverlaysRef.current.push(
              new kakao.maps.CustomOverlay({
                map: mapRef.current!,
                position: new kakao.maps.LatLng(cur.latitude, cur.longitude),
                content: createRouteArrowElement(bearingDeg),
                xAnchor: 0.5,
                yAnchor: 0.5,
                zIndex: 3,
              })
            );
          }

          const bounds = new kakao.maps.LatLngBounds();
          path.forEach((latLng) => bounds.extend(latLng));
          mapRef.current.setBounds(bounds);
        }

        // 사용자 마커
        const { element, coneEl } = createUserMarkerContent();
        animStateRef.current.coneEl = coneEl;
        userDotRef.current = new kakao.maps.CustomOverlay({
          map: mapRef.current,
          position: center,
          content: element,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 10,
        });

        // 고스트 마커 + 누적거리 사전 계산
        if (hasGhost) {
          const ghostEl = createGhostMarkerContent();
          ghostDotRef.current = new kakao.maps.CustomOverlay({
            map: mapRef.current,
            position: new kakao.maps.LatLng(
              coordinates[0].latitude,
              coordinates[0].longitude
            ),
            content: ghostEl,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: 9,
          });

          const cumDist = buildCumDist(coordinates);
          ghostStateRef.current.cumDist = cumDist;
          ghostStateRef.current.totalDist = cumDist[cumDist.length - 1];
          ghostStateRef.current.coords = coordinates;
          ghostStateRef.current.startMs = Date.now();
          ghostStateRef.current.totalPausedMs = 0;
          ghostStateRef.current.pauseStartMs = 0;
          ghostStateRef.current.isPaused = params.isPaused;
          if (params.isPaused) {
            ghostStateRef.current.pauseStartMs = Date.now();
          }
          console.log(
            '[GhostRunMap] 고스트 마커 생성 완료. totalDist:',
            ghostStateRef.current.totalDist,
            'm'
          );
        }

        // RAF 루프
        const s = animStateRef.current;
        const g = ghostStateRef.current;

        function tick() {
          // 사용자 도트 위치 lerp
          s.currentLat += (s.targetLat - s.currentLat) * MAP_LERP;
          s.currentLng += (s.targetLng - s.currentLng) * MAP_LERP;
          userDotRef.current?.setPosition(
            new kakao.maps.LatLng(s.currentLat, s.currentLng)
          );

          // 방향 cone
          const isMoving = (s.targetSpeed ?? 0) > 0.5;
          if (s.coneEl && s.targetHeading !== null && isMoving) {
            s.currentHeading = lerpAngle(
              s.currentHeading,
              s.targetHeading,
              MAP_LERP
            );
            s.coneEl.style.transform = `rotate(${s.currentHeading}deg)`;
            s.coneEl.style.opacity = '0.75';
          } else if (s.coneEl) {
            s.coneEl.style.opacity = '0';
          }

          // 고스트 도트 위치 갱신
          if (hasGhost) {
            const nowMs = Date.now();
            const elapsedSec = (nowMs - g.startMs - g.totalPausedMs) / 1000;
            const progress = Math.min(elapsedSec / ghostDurationSec, 1);
            const targetDist = progress * g.totalDist;
            if (params.ghostDistanceMRef) {
              params.ghostDistanceMRef.current = targetDist;
            }
            if (ghostDotRef.current && !g.isPaused) {
              const pos = interpolateAlongRoute(
                g.coords,
                g.cumDist,
                g.totalDist,
                targetDist
              );
              ghostDotRef.current.setPosition(
                new kakao.maps.LatLng(pos.lat, pos.lng)
              );
            }
            // 고스트 완주 최초 감지 → 콜백 1회 호출
            if (progress >= 1 && !ghostFinishedRef.current) {
              ghostFinishedRef.current = true;
              onGhostFinishedRef.current?.();
            }
          }

          s.rafId = requestAnimationFrame(tick);
        }

        s.rafId = requestAnimationFrame(tick);
      })
      .catch((err) => {
        console.error('[GhostRunMap] SDK 초기화 에러:', err);
      });

    return () => {
      cancelled = true;
      const s = animStateRef.current;
      if (s.rafId !== null) {
        cancelAnimationFrame(s.rafId);
        s.rafId = null;
      }
      routeArrowOverlaysRef.current.forEach((o) => o.setMap(null));
      routeArrowOverlaysRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // GPS 업데이트: 애니메이션 target 갱신 + 지도 중심 이동
  useEffect(() => {
    if (!location) return;

    const s = animStateRef.current;
    s.targetLat = location.latitude;
    s.targetLng = location.longitude;
    s.targetHeading = location.heading;
    s.targetSpeed = location.speedMps;

    if (!s.initialized) {
      s.currentLat = location.latitude;
      s.currentLng = location.longitude;
      s.currentHeading = location.heading ?? 0;
      s.initialized = true;
    }

    mapRef.current?.panTo(
      new kakao.maps.LatLng(location.latitude, location.longitude)
    );
  }, [location]);

  // visitedCount 변화 → 방문 구간 폴리라인 + 체크포인트 도트 색상 갱신
  useEffect(() => {
    const { checkpoints = [], visitedCount = 0, coordinates } = params;
    if (!mapRef.current || coordinates.length === 0) return;

    if (checkpointOverlaysRef.current.length !== checkpoints.length) {
      checkpointOverlaysRef.current.forEach((overlay) => overlay.setMap(null));
      checkpointOverlaysRef.current = checkpoints.map((cp) => {
        const el = createCheckpointDotContent();
        return new kakao.maps.CustomOverlay({
          map: mapRef.current!,
          position: new kakao.maps.LatLng(cp.latitude, cp.longitude),
          content: el,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 5,
        });
      });
    }

    if (visitedCount > 0) {
      const lastVisitedCoordIdx = checkpoints[visitedCount - 1]?.coordIdx ?? 0;
      const visitedPath = coordinates
        .slice(0, lastVisitedCoordIdx + 1)
        .map((c) => new kakao.maps.LatLng(c.latitude, c.longitude));
      visitedPolylineRef.current?.setPath(visitedPath);
    } else {
      visitedPolylineRef.current?.setPath([]);
    }

    checkpointOverlaysRef.current.forEach((overlay, i) => {
      const el = overlay.getContent() as HTMLElement;
      el.style.background = i < visitedCount ? '#22c55e' : '#9ca3af';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.checkpoints, params.visitedCount]);

  // 다음 체크포인트 게이트 1개만 시각화
  useEffect(() => {
    const { checkpoints = [], nextCheckpointIdx = 0 } = params;
    if (!mapRef.current) return;

    if (nextCheckpointIdx >= checkpoints.length) {
      nextGatePolylineRef.current?.setMap(null);
      nextGatePolylineRef.current = null;
      return;
    }

    const next = checkpoints[nextCheckpointIdx];
    const path = [
      new kakao.maps.LatLng(next.gate.startLatitude, next.gate.startLongitude),
      new kakao.maps.LatLng(next.gate.endLatitude, next.gate.endLongitude),
    ];

    if (!nextGatePolylineRef.current) {
      nextGatePolylineRef.current = createNextGatePolyline(path);
      nextGatePolylineRef.current.setMap(mapRef.current);
      return;
    }

    nextGatePolylineRef.current.setPath(path);
    nextGatePolylineRef.current.setMap(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.checkpoints, params.nextCheckpointIdx]);

  // isPaused 변화 → 고스트 시계 pause/resume
  useEffect(() => {
    const g = ghostStateRef.current;
    const wasPaused = g.isPaused;
    const nowPaused = params.isPaused;
    g.isPaused = nowPaused;

    if (!wasPaused && nowPaused) {
      // 일시정지 시작
      g.pauseStartMs = Date.now();
    } else if (wasPaused && !nowPaused) {
      // 재개: 일시정지 시간 누산
      g.totalPausedMs += Date.now() - g.pauseStartMs;
    }
  }, [params.isPaused]);

  // courseAnchor 변화 시 안정권 원 표시/제거
  useEffect(() => {
    const { courseAnchor } = params;

    if (courseAnchor && mapRef.current) {
      const center = new kakao.maps.LatLng(
        courseAnchor.latitude,
        courseAnchor.longitude
      );

      if (!safeZoneCircleRef.current) {
        safeZoneCircleRef.current = createSafeZoneCircle(center);
        safeZoneCircleRef.current.setMap(mapRef.current);
      } else {
        safeZoneCircleRef.current.setPosition(center);
      }
    } else {
      safeZoneCircleRef.current?.setMap(null);
      safeZoneCircleRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.courseAnchor]);
}
