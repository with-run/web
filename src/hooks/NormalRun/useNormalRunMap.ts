import { useEffect, useRef } from 'react';

import type { CoordinatePoint, RouteType } from '@/apis';
import type { Checkpoint } from '@/shared/hooks/useRunCheckpoints';
import { useRunLocation } from '@/shared/hooks/useRunLocation';
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
  createNextGatePolyline,
  createRouteArrowElement,
  createRoutePolyline,
  createSafeZoneCircle,
  createUserMarkerContent,
  createVisitedPolyline,
} from '@/shared/kakaoMap';
import { lerpAngle } from '@/shared/utils';

export function useNormalRunMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  params: {
    coordinates: CoordinatePoint[];
    routeType?: RouteType;
    courseAnchor: { latitude: number; longitude: number } | null;
    checkpoints?: Checkpoint[];
    visitedCount?: number;
    nextCheckpointIdx?: number;
  }
): void {
  const { location } = useRunLocation();
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const userDotRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const safeZoneCircleRef = useRef<kakao.maps.Circle | null>(null);
  const visitedPolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const remainingPolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const checkpointOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const nextGatePolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const routeArrowOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const animStateRef = useRef({
    rafId: null as number | null,
    currentLat: 0,
    currentLng: 0,
    // dead-reckoning: 마지막 GPS fix 기준으로 속도·방향 예측
    lastGpsLat: 0,
    lastGpsLng: 0,
    lastGpsSpeedMps: 0,
    lastGpsHeadingRad: 0,
    lastGpsTimestamp: 0,
    currentHeading: 0,
    targetHeading: null as number | null,
    targetSpeed: null as number | null,
    initialized: false,
    coneEl: null as HTMLElement | null,
  });

  // 지도 초기화 + 폴리라인 + 사용자 마커 + RAF 루프 시작
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { coordinates } = params;

    let cancelled = false;

    loadKakaoMapSdk().then(() => {
      if (cancelled) return;
      const center = new kakao.maps.LatLng(
        MAP_DEFAULT_CENTER.lat,
        MAP_DEFAULT_CENTER.lng
      );
      mapRef.current = new kakao.maps.Map(container, { center, level: 5 });

      // 폴리라인 (잔여 구간 파란색 + 방문 구간 녹색 오버레이)
      if (coordinates.length > 0) {
        const path = coordinates.map(
          (c) => new kakao.maps.LatLng(c.latitude, c.longitude)
        );

        remainingPolylineRef.current = createRoutePolyline(path);
        remainingPolylineRef.current.setMap(mapRef.current);

        visitedPolylineRef.current = createVisitedPolyline([]);
        visitedPolylineRef.current.setMap(mapRef.current);

        // 경로 전체가 보이도록 bounds 조정
        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((latLng) => bounds.extend(latLng));
        mapRef.current.setBounds(bounds);

        // 진행 방향 화살표 오버레이 (약 ROUTE_ARROW_COUNT개 균등 배치)
        // OUT_AND_BACK은 전반부(출발→반환점)에만 화살표 배치
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

          const arrowEl = createRouteArrowElement(bearingDeg);

          routeArrowOverlaysRef.current.push(
            new kakao.maps.CustomOverlay({
              map: mapRef.current!,
              position: new kakao.maps.LatLng(cur.latitude, cur.longitude),
              content: arrowEl,
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 3,
            })
          );
        }
      }

      // 사용자 위치 마커 (도트 + 방향 cone)
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

      // RAF 루프 시작
      const s = animStateRef.current;

      function tick() {
        if (!userDotRef.current) return;

        // dead-reckoning: 마지막 GPS fix + 경과 시간 × 속도·방향으로 예측 위치 계산
        if (s.initialized && s.lastGpsTimestamp > 0) {
          const elapsed = Math.min(
            (Date.now() - s.lastGpsTimestamp) / 1000,
            2.0
          );
          const cosLat = Math.cos((s.lastGpsLat * Math.PI) / 180);
          const predictedLat =
            s.lastGpsLat +
            (s.lastGpsSpeedMps * elapsed * Math.cos(s.lastGpsHeadingRad)) /
              M_PER_DEG_LAT;
          const predictedLng =
            s.lastGpsLng +
            (s.lastGpsSpeedMps * elapsed * Math.sin(s.lastGpsHeadingRad)) /
              (M_PER_DEG_LON_EQUATOR * cosLat);
          s.currentLat += (predictedLat - s.currentLat) * 0.25;
          s.currentLng += (predictedLng - s.currentLng) * 0.25;
        }
        userDotRef.current.setPosition(
          new kakao.maps.LatLng(s.currentLat, s.currentLng)
        );

        // 방향 cone 업데이트
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

        s.rafId = requestAnimationFrame(tick);
      }

      s.rafId = requestAnimationFrame(tick);
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

  // GPS 업데이트: 애니메이션 target 갱신 + 지도 중심 이동 (1Hz)
  useEffect(() => {
    if (!location) return;

    const s = animStateRef.current;
    // dead-reckoning 기준점 갱신
    s.lastGpsLat = location.latitude;
    s.lastGpsLng = location.longitude;
    s.lastGpsSpeedMps = location.speedMps ?? 0;
    s.lastGpsHeadingRad = ((location.heading ?? 0) * Math.PI) / 180;
    s.lastGpsTimestamp = Date.now();
    s.targetHeading = location.heading;
    s.targetSpeed = location.speedMps;

    // 첫 GPS 수신 시 current를 초기화 (원점에서 lerp 방지)
    if (!s.initialized) {
      s.currentLat = location.latitude;
      s.currentLng = location.longitude;
      s.currentHeading = location.heading ?? 0;
      s.initialized = true;
    }

    // 지도 중심 이동: 1Hz, Kakao 자체 애니메이션 사용 (RAF 루프 내 호출 금지)
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

    // 방문한 마지막 체크포인트의 coordIdx까지 녹색 폴리라인 적용
    if (visitedCount > 0) {
      const lastVisitedCoordIdx = checkpoints[visitedCount - 1]?.coordIdx ?? 0;
      const visitedPath = coordinates
        .slice(0, lastVisitedCoordIdx + 1)
        .map((c) => new kakao.maps.LatLng(c.latitude, c.longitude));
      visitedPolylineRef.current?.setPath(visitedPath);
    } else {
      visitedPolylineRef.current?.setPath([]);
    }

    // 체크포인트 도트 색상 갱신 (방문=녹색, 미방문=회색)
    checkpointOverlaysRef.current.forEach((overlay, i) => {
      const el = overlay.getContent() as HTMLElement;
      el.style.background = i < visitedCount ? '#22c55e' : '#9ca3af';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.checkpoints, params.visitedCount]);

  // 다음에 지나야 하는 체크포인트 게이트 1개만 시각화
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

  // courseAnchor 변화 시 안정권 원(반지름 30m) 표시/제거
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
