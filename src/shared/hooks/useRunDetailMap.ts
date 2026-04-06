import { useEffect, useMemo, useRef, useState } from 'react';

import type { CoordinatePoint, RouteType } from '@/apis';
import {
  M_PER_DEG_LAT,
  M_PER_DEG_LON_EQUATOR,
  ROUTE_ARROW_COUNT,
} from '@/shared/constants/map';
import { loadKakaoMapSdk } from '@/shared/libs';
import {
  createDistanceBadgeElement,
  createMarkerContent,
  createRouteArrowElement,
  createRoutePolyline,
  createUserDotContent,
} from '@/shared/kakaoMap';
import { haversineM, metersPerDegLon } from '@/shared/utils';
import { buildCumDist } from '@/shared/utils/geo';
import { useRunLocation } from './useRunLocation';

const START_GATE_HALF_WIDTH_M = 15;
const START_GATE_HALF_DEPTH_M = 2.5; // 총 폭 5m
const START_FALLBACK_RADIUS_M = 10;
const START_GATE_REACHED_COLOR = '#22c55e';
const START_GATE_DEFAULT_FALLBACK_COLOR = '#4F80FF';
const CHECKPOINT_GATE_COLOR = '#f97316';
const CHECKPOINT_GATE_WEIGHT = 3;
const CHECKPOINT_GATE_OPACITY = 0.85;

const TARGET_CHECKPOINT_SPACING_M = 300;
const MIN_CHECKPOINT_SPACING_M = 80;
const MAX_CHECKPOINTS = 15;
const CHECKPOINT_GATE_HALF_WIDTH_M = 20;

type StartGate = {
  centerLat: number;
  centerLng: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  halfWidthM: number;
  halfDepthM: number;
  lineStartLat: number;
  lineStartLng: number;
  lineEndLat: number;
  lineEndLng: number;
};

type CheckpointGateLine = {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
};

function resolveCheckpointCount(totalDistM: number): number {
  if (totalDistM <= 0) return 0;
  if (totalDistM < MIN_CHECKPOINT_SPACING_M) return 1;

  const estimated = Math.round(totalDistM / TARGET_CHECKPOINT_SPACING_M) + 1;
  return Math.max(2, Math.min(MAX_CHECKPOINTS, estimated));
}

function normalizeDirection(dx: number, dy: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

function buildCheckpointGateLine(
  cpLat: number,
  cpLng: number,
  dirX: number,
  dirY: number
): CheckpointGateLine {
  const mPerDegLon = metersPerDegLon(cpLat);

  const nx = -dirY;
  const ny = dirX;

  const startLat = cpLat + (ny * CHECKPOINT_GATE_HALF_WIDTH_M) / M_PER_DEG_LAT;
  const startLng = cpLng + (nx * CHECKPOINT_GATE_HALF_WIDTH_M) / mPerDegLon;
  const endLat = cpLat - (ny * CHECKPOINT_GATE_HALF_WIDTH_M) / M_PER_DEG_LAT;
  const endLng = cpLng - (nx * CHECKPOINT_GATE_HALF_WIDTH_M) / mPerDegLon;

  return {
    startLatitude: startLat,
    startLongitude: startLng,
    endLatitude: endLat,
    endLongitude: endLng,
  };
}

function buildCheckpointGateLines(
  coords: CoordinatePoint[]
): CheckpointGateLine[] {
  if (coords.length < 2) return [];

  const cumDist = buildCumDist(coords);
  const totalDist = cumDist[cumDist.length - 1] ?? 0;
  const checkpointCount = resolveCheckpointCount(totalDist);
  if (checkpointCount <= 0) return [];

  const gates: CheckpointGateLine[] = [];
  for (let step = 1; step <= checkpointCount; step++) {
    const targetDist =
      step === checkpointCount
        ? totalDist
        : (totalDist * step) / checkpointCount;

    let lo = 0;
    let hi = cumDist.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (cumDist[mid] <= targetDist) lo = mid;
      else hi = mid;
    }

    const segLen = cumDist[hi] - cumDist[lo];
    const t = segLen > 0 ? (targetDist - cumDist[lo]) / segLen : 0;

    const cpLat =
      coords[lo].latitude + t * (coords[hi].latitude - coords[lo].latitude);
    const cpLng =
      coords[lo].longitude + t * (coords[hi].longitude - coords[lo].longitude);

    const segDir = normalizeDirection(
      (coords[hi].longitude - coords[lo].longitude) * metersPerDegLon(cpLat),
      (coords[hi].latitude - coords[lo].latitude) * M_PER_DEG_LAT
    );

    gates.push(buildCheckpointGateLine(cpLat, cpLng, segDir.x, segDir.y));
  }

  return gates;
}

function toLocalMeters(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): { x: number; y: number } {
  const mPerDegLon = metersPerDegLon(originLat);
  return {
    x: (lng - originLng) * mPerDegLon,
    y: (lat - originLat) * M_PER_DEG_LAT,
  };
}

function addMetersToLatLng(
  originLat: number,
  originLng: number,
  xM: number,
  yM: number
): { lat: number; lng: number } {
  const mPerDegLon = metersPerDegLon(originLat);
  return {
    lat: originLat + yM / M_PER_DEG_LAT,
    lng: originLng + xM / mPerDegLon,
  };
}

function pickStartDirectionPoint(
  coordinates: CoordinatePoint[],
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
): { latitude: number; longitude: number } {
  if (coordinates.length >= 2) {
    const first = coordinates[0];
    const second = coordinates[1];
    const firstToStart = haversineM(
      first.latitude,
      first.longitude,
      startLatitude,
      startLongitude
    );

    // 코스 첫 좌표가 start와 거의 같은 경우, 접선은 0->1을 사용
    if (firstToStart <= 15) return second;
    return first;
  }

  return { latitude: endLatitude, longitude: endLongitude };
}

function buildStartGate(
  coordinates: CoordinatePoint[],
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number
): StartGate | null {
  const next = pickStartDirectionPoint(
    coordinates,
    startLatitude,
    startLongitude,
    endLatitude,
    endLongitude
  );

  const mPerDegLon = metersPerDegLon(startLatitude);
  const txRaw = (next.longitude - startLongitude) * mPerDegLon;
  const tyRaw = (next.latitude - startLatitude) * M_PER_DEG_LAT;
  const len = Math.hypot(txRaw, tyRaw);
  if (len < 1e-6) return null;

  const tx = txRaw / len;
  const ty = tyRaw / len;
  const nx = -ty;
  const ny = tx;

  const lineStart = addMetersToLatLng(
    startLatitude,
    startLongitude,
    nx * START_GATE_HALF_WIDTH_M,
    ny * START_GATE_HALF_WIDTH_M
  );
  const lineEnd = addMetersToLatLng(
    startLatitude,
    startLongitude,
    -nx * START_GATE_HALF_WIDTH_M,
    -ny * START_GATE_HALF_WIDTH_M
  );

  return {
    centerLat: startLatitude,
    centerLng: startLongitude,
    tx,
    ty,
    nx,
    ny,
    halfWidthM: START_GATE_HALF_WIDTH_M,
    halfDepthM: START_GATE_HALF_DEPTH_M,
    lineStartLat: lineStart.lat,
    lineStartLng: lineStart.lng,
    lineEndLat: lineEnd.lat,
    lineEndLng: lineEnd.lng,
  };
}

function isInsideStartGate(
  lat: number,
  lng: number,
  gate: StartGate | null
): boolean {
  if (!gate) return false;

  const { x, y } = toLocalMeters(lat, lng, gate.centerLat, gate.centerLng);
  const lateral = x * gate.nx + y * gate.ny;
  const longitudinal = x * gate.tx + y * gate.ty;

  return (
    Math.abs(lateral) <= gate.halfWidthM &&
    Math.abs(longitudinal) <= gate.halfDepthM
  );
}

function resolvePrimaryColor(): string {
  if (typeof window === 'undefined') return START_GATE_DEFAULT_FALLBACK_COLOR;
  const token = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary-1')
    .trim();
  if (!token) return START_GATE_DEFAULT_FALLBACK_COLOR;
  return `hsl(${token})`;
}


type CourseMapParams = {
  coordinates: CoordinatePoint[];
  routeType?: RouteType;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
};

type UseRunDetailMapOptions = {
  onMapTouched?: () => void;
};

export function useRunDetailMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  course: CourseMapParams,
  options?: UseRunDetailMapOptions
): { isNearStart: boolean } {
  const { location } = useRunLocation();
  const [isNearStart, setIsNearStart] = useState(false);
  const onMapTouchedRef = useRef(options?.onMapTouched);

  const startGate = useMemo(
    () =>
      buildStartGate(
        course.coordinates,
        course.startLatitude,
        course.startLongitude,
        course.endLatitude,
        course.endLongitude
      ),
    [
      course.coordinates,
      course.startLatitude,
      course.startLongitude,
      course.endLatitude,
      course.endLongitude,
    ]
  );

  const mapRef = useRef<kakao.maps.Map | null>(null);
  const userDotRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const startGateRectRef = useRef<kakao.maps.Polygon | null>(null);
  const startGateLineRef = useRef<kakao.maps.Polyline | null>(null);
  const startToUserLineRef = useRef<kakao.maps.Polyline | null>(null);
  const startToUserDistanceRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const defaultGateColorRef = useRef(START_GATE_DEFAULT_FALLBACK_COLOR);
  const coursePathRef = useRef<kakao.maps.LatLng[]>([]);
  const hasInitialBoundsRef = useRef(false);
  const routeArrowOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([]);
  const checkpointGateLinesRef = useRef<kakao.maps.Polyline[]>([]);
  const collapseOnClickHandlerRef = useRef<(() => void) | null>(null);
  const collapseOnDragStartHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onMapTouchedRef.current = options?.onMapTouched;
  }, [options?.onMapTouched]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const {
      coordinates,
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    } = course;
    let cancelled = false;
    defaultGateColorRef.current = resolvePrimaryColor();

    loadKakaoMapSdk().then(() => {
      if (cancelled) return;

      const startLatLng = new kakao.maps.LatLng(startLatitude, startLongitude);
      mapRef.current = new kakao.maps.Map(container, {
        center: startLatLng,
        level: 5,
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

      if (coordinates.length > 0) {
        const path = coordinates.map(
          (c) => new kakao.maps.LatLng(c.latitude, c.longitude)
        );
        coursePathRef.current = path;

        const polyline = createRoutePolyline(path);
        polyline.setMap(mapRef.current);

        // 진행 방향 화살표 오버레이 (ROUTE_ARROW_COUNT개 균등 배치)
        // OUT_AND_BACK은 전반부(출발→반환점)에만 화살표 배치
        const arrowCoords =
          course.routeType === 'OUT_AND_BACK'
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

        const checkpointGateLines = buildCheckpointGateLines(coordinates);
        checkpointGateLinesRef.current = checkpointGateLines.map((gate) => {
          const gateLine = new kakao.maps.Polyline({
            path: [
              new kakao.maps.LatLng(gate.startLatitude, gate.startLongitude),
              new kakao.maps.LatLng(gate.endLatitude, gate.endLongitude),
            ],
            strokeWeight: CHECKPOINT_GATE_WEIGHT,
            strokeColor: CHECKPOINT_GATE_COLOR,
            strokeOpacity: CHECKPOINT_GATE_OPACITY,
            strokeStyle: 'shortdash',
          });
          gateLine.setMap(mapRef.current);
          return gateLine;
        });
      }

      // 시작 게이트 시각화 (사각 윈도우 + 게이트 선)
      if (startGate) {
        const p1 = addMetersToLatLng(
          startGate.centerLat,
          startGate.centerLng,
          startGate.nx * startGate.halfWidthM +
            startGate.tx * startGate.halfDepthM,
          startGate.ny * startGate.halfWidthM +
            startGate.ty * startGate.halfDepthM
        );
        const p2 = addMetersToLatLng(
          startGate.centerLat,
          startGate.centerLng,
          -startGate.nx * startGate.halfWidthM +
            startGate.tx * startGate.halfDepthM,
          -startGate.ny * startGate.halfWidthM +
            startGate.ty * startGate.halfDepthM
        );
        const p3 = addMetersToLatLng(
          startGate.centerLat,
          startGate.centerLng,
          -startGate.nx * startGate.halfWidthM -
            startGate.tx * startGate.halfDepthM,
          -startGate.ny * startGate.halfWidthM -
            startGate.ty * startGate.halfDepthM
        );
        const p4 = addMetersToLatLng(
          startGate.centerLat,
          startGate.centerLng,
          startGate.nx * startGate.halfWidthM -
            startGate.tx * startGate.halfDepthM,
          startGate.ny * startGate.halfWidthM -
            startGate.ty * startGate.halfDepthM
        );

        startGateRectRef.current = new kakao.maps.Polygon({
          path: [
            new kakao.maps.LatLng(p1.lat, p1.lng),
            new kakao.maps.LatLng(p2.lat, p2.lng),
            new kakao.maps.LatLng(p3.lat, p3.lng),
            new kakao.maps.LatLng(p4.lat, p4.lng),
          ],
          strokeWeight: 1,
          strokeColor: defaultGateColorRef.current,
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
          fillColor: defaultGateColorRef.current,
          fillOpacity: 0.14,
        });
        startGateRectRef.current.setMap(mapRef.current);

        startGateLineRef.current = new kakao.maps.Polyline({
          path: [
            new kakao.maps.LatLng(
              startGate.lineStartLat,
              startGate.lineStartLng
            ),
            new kakao.maps.LatLng(startGate.lineEndLat, startGate.lineEndLng),
          ],
          strokeWeight: 4,
          strokeColor: defaultGateColorRef.current,
          strokeOpacity: 0.95,
          strokeStyle: 'shortdash',
        });
        startGateLineRef.current.setMap(mapRef.current);
      }

      new kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: startLatLng,
        content: createMarkerContent('출발', '#22C55E'),
        xAnchor: 0.5,
        yAnchor: 0.5,
      });

      new kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: new kakao.maps.LatLng(endLatitude, endLongitude),
        content: createMarkerContent('도착', '#EF4444'),
        xAnchor: 0.5,
        yAnchor: 0.5,
      });

      userDotRef.current = new kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: startLatLng,
        content: createUserDotContent('내 위치', '#3B82F6'),
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 10,
      });

      // 출발점 ↔ 내 위치 실시간 점선
      startToUserLineRef.current = new kakao.maps.Polyline({
        path: [startLatLng, startLatLng],
        strokeWeight: 3,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeStyle: 'shortdash',
      });
      startToUserLineRef.current.setMap(mapRef.current);

      // 점선 중간 거리 배지
      const distanceTag = createDistanceBadgeElement();
      startToUserDistanceRef.current = new kakao.maps.CustomOverlay({
        map: mapRef.current,
        position: startLatLng,
        content: distanceTag,
        xAnchor: 0.5,
        yAnchor: 1.35,
        zIndex: 11,
      });
    });

    return () => {
      cancelled = true;
      routeArrowOverlaysRef.current.forEach((o) => o.setMap(null));
      routeArrowOverlaysRef.current = [];
      checkpointGateLinesRef.current.forEach((line) => line.setMap(null));
      checkpointGateLinesRef.current = [];
      startToUserLineRef.current?.setMap(null);
      startToUserLineRef.current = null;
      startToUserDistanceRef.current?.setMap(null);
      startToUserDistanceRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  // 사용자 위치 변화 시: 도트 이동 + 초기 bounds 조정(1회) + 시작 게이트 진입 감지
  useEffect(() => {
    if (!location || !mapRef.current || !userDotRef.current) return;

    const { latitude, longitude } = location;
    const latLng = new kakao.maps.LatLng(latitude, longitude);
    userDotRef.current.setPosition(latLng);

    const startLatLng = new kakao.maps.LatLng(
      course.startLatitude,
      course.startLongitude
    );
    startToUserLineRef.current?.setPath([startLatLng, latLng]);

    const midpoint = new kakao.maps.LatLng(
      (course.startLatitude + latitude) / 2,
      (course.startLongitude + longitude) / 2
    );
    startToUserDistanceRef.current?.setPosition(midpoint);

    if (!hasInitialBoundsRef.current && coursePathRef.current.length > 0) {
      const bounds = new kakao.maps.LatLngBounds();
      coursePathRef.current.forEach((p) => bounds.extend(p));
      bounds.extend(latLng);
      mapRef.current.setBounds(bounds);
      hasInitialBoundsRef.current = true;
    }

    const inStartGate = isInsideStartGate(latitude, longitude, startGate);
    const fallbackDistM = haversineM(
      latitude,
      longitude,
      course.startLatitude,
      course.startLongitude
    );
    const distanceEl = startToUserDistanceRef.current?.getContent() as
      | HTMLElement
      | undefined;
    if (distanceEl) distanceEl.textContent = `${Math.round(fallbackDistM)}m`;

    const nextIsNearStart =
      inStartGate || fallbackDistM <= START_FALLBACK_RADIUS_M;
    setIsNearStart(nextIsNearStart);

    const gateColor = nextIsNearStart
      ? START_GATE_REACHED_COLOR
      : defaultGateColorRef.current;
    startGateRectRef.current?.setOptions({
      strokeColor: gateColor,
      fillColor: gateColor,
    });
    startGateLineRef.current?.setOptions({
      strokeColor: gateColor,
    });
  }, [location, course.startLatitude, course.startLongitude, startGate]);

  return { isNearStart };
}
