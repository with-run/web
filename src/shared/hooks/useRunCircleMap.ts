import { useEffect, useRef, useState } from 'react';

import type { CourseItem } from '@/apis';
import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';
import {
  COURSE_SEARCH_DEFAULT_RADIUS_M,
  MAP_DEFAULT_CENTER,
} from '@/shared/constants/map';
import { loadKakaoMapSdk } from '@/shared/libs';
import { createExplorationCircle, createMarkerContent } from '@/shared/kakaoMap';
import { haversineM } from '@/shared/utils';

export type CircleMode = 'USER_LOCATION' | 'AREA_NEARBY' | 'AREA_EXPLORE';

// 기본 지도 레벨
const DEFAULT_MAP_LEVEL = 7;
const DEFAULT_MARKER_COLOR = 'hsl(29 94% 58%)';

function resolveMapColor(colorOrToken: string): string {
  if (typeof window === 'undefined') {
    return DEFAULT_MARKER_COLOR;
  }

  if (colorOrToken.startsWith('--')) {
    const resolvedValue = getComputedStyle(document.documentElement)
      .getPropertyValue(colorOrToken)
      .trim();

    return resolvedValue ? `hsl(${resolvedValue})` : DEFAULT_MARKER_COLOR;
  }

  return colorOrToken;
}

// 구심점에서 정동쪽으로 radiusM 떨어진 좌표 (엣지 마커 초기 위치)
function eastPoint(
  lat: number,
  lon: number,
  radiusM: number
): kakao.maps.LatLng {
  const dLon =
    radiusM / 1000 / (111.32 * Math.cos((lat * Math.PI) / 180));
  return new kakao.maps.LatLng(lat, lon + dLon);
}

type Center = { latitude: number; longitude: number };

type UseRunCircleMapReturn = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  center: Center | null;
  radiusM: number;
};

export function useRunCircleMap(
  courses: CourseItem[],
  circleMode: CircleMode,
  onMapTouched?: () => void,
  markerColor = '--primary-1',
  recenterToUserRequestKey = 0
): UseRunCircleMapReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  const mapRef = useRef<kakao.maps.Map | null>(null);
  const circleRef = useRef<kakao.maps.Circle | null>(null);
  const centerMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const edgeMarkerRef = useRef<kakao.maps.Marker | null>(null);
  const courseMarkersRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const clickHandlerRef = useRef<
    ((e: kakao.maps.event.MouseEvent) => void) | null
  >(null);
  const collapseOnClickHandlerRef = useRef<(() => void) | null>(null);
  const collapseOnDragStartHandlerRef = useRef<(() => void) | null>(null);
  const onMapTouchedRef = useRef(onMapTouched);

  const [center, setCenter] = useState<Center | null>(null);
  const [radiusM, setRadiusM] = useState(COURSE_SEARCH_DEFAULT_RADIUS_M);
  const resolvedMarkerColor = resolveMapColor(markerColor);

  // 최신 radiusM을 click handler에서 stale closure 없이 접근하기 위한 ref
  const radiusMRef = useRef(COURSE_SEARCH_DEFAULT_RADIUS_M);
  const recenterKeyRef = useRef(recenterToUserRequestKey);

  useEffect(() => {
    onMapTouchedRef.current = onMapTouched;
  }, [onMapTouched]);

  // 지도 + 원 + 마커 초기화 (최초 1회)
  useEffect(() => {
    if (!containerRef.current) return;

    const signal = { cancelled: false };

    // SDK 로드를 GPS 획득과 병렬로 즉시 시작
    const sdkReady = loadKakaoMapSdk();

    function initMap(initLat: number, initLon: number) {
      if (signal.cancelled || !containerRef.current) return;

      sdkReady.then(() => {
        if (signal.cancelled) return;

        const initLatLng = new kakao.maps.LatLng(initLat, initLon);

        mapRef.current = new kakao.maps.Map(containerRef.current!, {
          center: initLatLng,
          level: DEFAULT_MAP_LEVEL,
        });

        collapseOnClickHandlerRef.current = () => {
          onMapTouchedRef.current?.();
        };
        collapseOnDragStartHandlerRef.current = () => {
          onMapTouchedRef.current?.();
        };
        kakao.maps.event.addListener(
          mapRef.current,
          'click',
          collapseOnClickHandlerRef.current
        );
        kakao.maps.event.addListener(
          mapRef.current,
          'dragstart',
          collapseOnDragStartHandlerRef.current
        );

        // 탐색 원
        circleRef.current = createExplorationCircle(
          initLatLng,
          COURSE_SEARCH_DEFAULT_RADIUS_M,
          resolvedMarkerColor
        );
        circleRef.current.setMap(mapRef.current);

        // 구심점 마커 (시각적 표시용)
        centerMarkerRef.current = new kakao.maps.Marker({
          position: initLatLng,
          map: mapRef.current,
        });

        // 엣지 마커 — 항상 드래그 가능 (반경 조정용)
        const initEdgeLatLng = eastPoint(
          initLat,
          initLon,
          COURSE_SEARCH_DEFAULT_RADIUS_M
        );
        edgeMarkerRef.current = new kakao.maps.Marker({
          position: initEdgeLatLng,
          map: mapRef.current,
          draggable: true,
          title: '반경 조정 (드래그)',
        });

        // 엣지 마커 drag → 반경 시각적 실시간 업데이트 (React state 업데이트 없음)
        kakao.maps.event.addListener(edgeMarkerRef.current, 'drag', () => {
          if (
            !circleRef.current ||
            !centerMarkerRef.current ||
            !edgeMarkerRef.current
          )
            return;

          const cp = centerMarkerRef.current.getPosition();
          const ep = edgeMarkerRef.current.getPosition();
          circleRef.current.setRadius(
            Math.round(
              haversineM(cp.getLat(), cp.getLng(), ep.getLat(), ep.getLng())
            )
          );
        });

        // 엣지 마커 dragend → 반경 state + ref 업데이트 → API 재호출 트리거
        kakao.maps.event.addListener(edgeMarkerRef.current, 'dragend', () => {
          if (
            !circleRef.current ||
            !centerMarkerRef.current ||
            !edgeMarkerRef.current
          )
            return;

          const centerPos = centerMarkerRef.current.getPosition();
          const edgePos = edgeMarkerRef.current.getPosition();
          const newRadiusM = Math.round(
            haversineM(
              centerPos.getLat(),
              centerPos.getLng(),
              edgePos.getLat(),
              edgePos.getLng()
            )
          );

          circleRef.current.setRadius(newRadiusM);
          radiusMRef.current = newRadiusM;
          setRadiusM(newRadiusM);
        });

        setCenter({ latitude: initLat, longitude: initLon });
      });
    }

    async function init() {
      // 1. 모바일 브릿지 GPS 우선
      if (gpsLocation) {
        initMap(gpsLocation.latitude, gpsLocation.longitude);
        return;
      }

      // 2. 브라우저 Geolocation API 시도
      try {
        const location = await new Promise<{
          latitude: number;
          longitude: number;
        }>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(
            ({ coords }) =>
              resolve({
                latitude: coords.latitude,
                longitude: coords.longitude,
              }),
            reject,
            { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
          )
        );
        if (!signal.cancelled) {
          initMap(location.latitude, location.longitude);
        }
      } catch {
        // 3. 모두 실패 시 서울 시청 폴백
        if (!signal.cancelled) {
          initMap(MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng);
        }
      }
    }

    init();

    return () => {
      signal.cancelled = true;
      if (mapRef.current) {
        if (collapseOnClickHandlerRef.current) {
          kakao.maps.event.removeListener(
            mapRef.current,
            'click',
            collapseOnClickHandlerRef.current
          );
        }
        if (collapseOnDragStartHandlerRef.current) {
          kakao.maps.event.removeListener(
            mapRef.current,
            'dragstart',
            collapseOnDragStartHandlerRef.current
          );
        }
      }
    };
    // containerRef, gpsLocation: 초기화 시점 1회만 사용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // circleMode 변경 시 map click listener 관리
  useEffect(() => {
    if (!mapRef.current) return;

    // 기존 리스너 제거
    if (clickHandlerRef.current) {
      kakao.maps.event.removeListener(
        mapRef.current,
        'click',
        clickHandlerRef.current
      );
      clickHandlerRef.current = null;
    }

    if (circleMode !== 'USER_LOCATION') {
      clickHandlerRef.current = (e: kakao.maps.event.MouseEvent) => {
        const newLatLng = e.latLng;
        centerMarkerRef.current?.setPosition(newLatLng);
        circleRef.current?.setPosition(newLatLng);
        edgeMarkerRef.current?.setPosition(
          eastPoint(newLatLng.getLat(), newLatLng.getLng(), radiusMRef.current)
        );
        setCenter({
          latitude: newLatLng.getLat(),
          longitude: newLatLng.getLng(),
        });
      };
      kakao.maps.event.addListener(
        mapRef.current,
        'click',
        clickHandlerRef.current
      );
    }
    // mapRef.current는 초기화 후 변경 없음
  }, [circleMode, onMapTouched]);

  // "내 위치" 버튼 클릭 시 현재 사용자 좌표로 지도 중심 이동 + 재조회 트리거
  useEffect(() => {
    if (recenterToUserRequestKey === recenterKeyRef.current) return;
    recenterKeyRef.current = recenterToUserRequestKey;
    if (!mapRef.current) return;

    const moveTo = (lat: number, lon: number) => {
      const latLng = new kakao.maps.LatLng(lat, lon);
      mapRef.current?.setCenter(latLng);
      centerMarkerRef.current?.setPosition(latLng);
      circleRef.current?.setPosition(latLng);
      edgeMarkerRef.current?.setPosition(eastPoint(lat, lon, radiusMRef.current));
      setCenter({ latitude: lat, longitude: lon });
    };

    if (gpsLocation) {
      moveTo(gpsLocation.latitude, gpsLocation.longitude);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => moveTo(coords.latitude, coords.longitude),
      () => {
        /* ignore */
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 }
    );
  }, [gpsLocation, recenterToUserRequestKey]);

  // 코스 출발점 마커 업데이트 (courses 변경 시)
  useEffect(() => {
    if (!mapRef.current) return;

    courseMarkersRef.current.forEach((overlay) => overlay.setMap(null));
    courseMarkersRef.current = [];

    courses.forEach((course) => {
      const overlay = new kakao.maps.CustomOverlay({
        map: mapRef.current!,
        position: new kakao.maps.LatLng(
          course.startLatitude,
          course.startLongitude
        ),
        content: createMarkerContent(course.title, resolvedMarkerColor),
        xAnchor: 0.5,
        yAnchor: 1.0,
        zIndex: 5,
      });
      courseMarkersRef.current.push(overlay);
    });
  }, [courses, resolvedMarkerColor]);

  return { containerRef, center, radiusM };
}
