import { useEffect, useRef } from 'react';

import { useRunLocation } from '@/shared/hooks/useRunLocation';
import { MAP_DEFAULT_CENTER, MAP_LERP } from '@/shared/constants/map';
import { createFreeRunTracePolyline, createUserMarkerContent } from '@/shared/kakaoMap';
import { lerpAngle } from '@/shared/utils';
import { haversineM } from '@/shared/utils/geo';

const TRACE_NOISE_MIN_M = 0.7;
const TRACE_NOISE_MAX_M = 120;


export function useFreeRunningMap(containerRef: React.RefObject<HTMLDivElement | null>): void {
  const { location } = useRunLocation();
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const userDotRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const tracePolylineRef = useRef<kakao.maps.Polyline | null>(null);
  const tracePathRef = useRef<kakao.maps.LatLng[]>([]);
  const lastTracePointRef = useRef<{ latitude: number; longitude: number } | null>(null);
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

  // 지도 초기화 + 사용자 마커 생성
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    kakao.maps.load(() => {
      const center = new kakao.maps.LatLng(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng);
      mapRef.current = new kakao.maps.Map(container, { center, level: 5 });
      tracePolylineRef.current = createFreeRunTracePolyline(tracePathRef.current);
      tracePolylineRef.current.setMap(mapRef.current);

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
      // 
      const s = animStateRef.current;

      function tick() {
        if (!userDotRef.current) return;

        // 위치 보간
        s.currentLat += (s.targetLat - s.currentLat) * MAP_LERP;
        s.currentLng += (s.targetLng - s.currentLng) * MAP_LERP;
        userDotRef.current.setPosition(new kakao.maps.LatLng(s.currentLat, s.currentLng));

        // 방향 cone 업데이트
        const isMoving = (s.targetSpeed ?? 0) > 0.5;
        if (s.coneEl && s.targetHeading !== null && isMoving) {
          s.currentHeading = lerpAngle(s.currentHeading, s.targetHeading, MAP_LERP);
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
      const s = animStateRef.current;
      if (s.rafId !== null) {
        cancelAnimationFrame(s.rafId);
        s.rafId = null;
      }
      tracePolylineRef.current?.setMap(null);
      tracePolylineRef.current = null;
      tracePathRef.current = [];
      lastTracePointRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // GPS 업데이트: 애니메이션 target 갱신 + 지도 중심 이동 (1Hz)
  useEffect(() => {
    if (!location) return;

    const s = animStateRef.current;
    s.targetLat = location.latitude;
    s.targetLng = location.longitude;
    s.targetHeading = location.heading;
    s.targetSpeed = location.speedMps;

    // 첫 GPS 수신 시 current를 target으로 초기화 (원점에서 lerp 방지)
    if (!s.initialized) {
      s.currentLat = location.latitude;
      s.currentLng = location.longitude;
      s.currentHeading = location.heading ?? 0;
      s.initialized = true;
    }

    // 지도 중심 이동: 사용자 중심으로 고정
    mapRef.current?.setCenter(
      new kakao.maps.LatLng(location.latitude, location.longitude)
    );

    const last = lastTracePointRef.current;
    if (!last) {
      tracePathRef.current = [
        ...tracePathRef.current,
        new kakao.maps.LatLng(location.latitude, location.longitude),
      ];
      lastTracePointRef.current = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      tracePolylineRef.current?.setPath(tracePathRef.current);
      return;
    }

    const deltaM = haversineM(
      last.latitude,
      last.longitude,
      location.latitude,
      location.longitude
    );

    if (deltaM < TRACE_NOISE_MIN_M) {
      return;
    }
    if (deltaM > TRACE_NOISE_MAX_M) {
      // 비정상 점프는 선으로 잇지 않고 기준점만 재설정해서 이후 누적이 멈추지 않게 한다.
      lastTracePointRef.current = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      return;
    }

    tracePathRef.current = [
      ...tracePathRef.current,
      new kakao.maps.LatLng(location.latitude, location.longitude),
    ];
    lastTracePointRef.current = {
      latitude: location.latitude,
      longitude: location.longitude,
    };
    tracePolylineRef.current?.setPath(tracePathRef.current);
  }, [location]);
}
