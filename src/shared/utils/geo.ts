// Haversine 공식 기반 GPS 거리 계산 유틸
import type { CoordinatePoint } from '@/apis/course';

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}

// 점 P에서 폴리라인(선분 배열)까지의 최단 거리 (m)
// 각 선분에 수직 투영 후 Haversine으로 최종 거리 계산
export function pointToPolylineM(
  lat: number,
  lon: number,
  polyline: { latitude: number; longitude: number }[]
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineM(lat, lon, polyline[0].latitude, polyline[0].longitude);

  const DEG_TO_RAD = Math.PI / 180;
  const cosLat = Math.cos(lat * DEG_TO_RAD);

  let minDist = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i].longitude * cosLat;
    const ay = polyline[i].latitude;
    const bx = polyline[i + 1].longitude * cosLat;
    const by = polyline[i + 1].latitude;
    const px = lon * cosLat;
    const py = lat;

    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;

    // A=B인 경우 점 거리로 폴백
    if (ab2 === 0) {
      const d = haversineM(lat, lon, polyline[i].latitude, polyline[i].longitude);
      if (d < minDist) minDist = d;
      continue;
    }

    // 투영 계수 t ∈ [0, 1] 클램프
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2));
    const closestLon = (ax + t * abx) / cosLat;
    const closestLat = ay + t * aby;

    const d = haversineM(lat, lon, closestLat, closestLon);
    if (d < minDist) minDist = d;
  }

  return minDist;
}

// 점 P에서 폴리라인까지의 최근접 좌표 반환
// pointToPolylineM과 동일한 알고리즘, 거리 대신 좌표 반환
export function nearestPointOnPolyline(
  lat: number,
  lon: number,
  polyline: { latitude: number; longitude: number }[]
): { latitude: number; longitude: number } {
  if (polyline.length === 0) return { latitude: lat, longitude: lon };
  if (polyline.length === 1) return { latitude: polyline[0].latitude, longitude: polyline[0].longitude };

  const DEG_TO_RAD = Math.PI / 180;
  const cosLat = Math.cos(lat * DEG_TO_RAD);

  let minDist = Infinity;
  let nearestLat = polyline[0].latitude;
  let nearestLon = polyline[0].longitude;

  for (let i = 0; i < polyline.length - 1; i++) {
    const ax = polyline[i].longitude * cosLat;
    const ay = polyline[i].latitude;
    const bx = polyline[i + 1].longitude * cosLat;
    const by = polyline[i + 1].latitude;
    const px = lon * cosLat;
    const py = lat;

    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;

    let closestLat: number;
    let closestLon: number;

    if (ab2 === 0) {
      closestLat = polyline[i].latitude;
      closestLon = polyline[i].longitude;
    } else {
      const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2));
      closestLon = (ax + t * abx) / cosLat;
      closestLat = ay + t * aby;
    }

    const d = haversineM(lat, lon, closestLat, closestLon);
    if (d < minDist) {
      minDist = d;
      nearestLat = closestLat;
      nearestLon = closestLon;
    }
  }

  return { latitude: nearestLat, longitude: nearestLon };
}

/** 코스 좌표 배열에서 누적 거리(m) 배열 빌드. cumDist[i] = 좌표 0 → i 까지 */
export function buildCumDist(coords: CoordinatePoint[]): number[] {
  const cumDist = [0];
  for (let i = 1; i < coords.length; i++) {
    const d = haversineM(
      coords[i - 1].latitude,
      coords[i - 1].longitude,
      coords[i].latitude,
      coords[i].longitude
    );
    cumDist.push(cumDist[i - 1] + d);
  }
  return cumDist;
}

/** 위도 latDeg 기준 경도 1도당 미터 (적도 기준 × cos(lat)) */
export function metersPerDegLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180);
}

/**
 * 최단 경로 각도 보간 (359° → 1° = +2°, −358° 아님)
 * @param current 현재 각도 (0~360)
 * @param target 목표 각도 (0~360)
 * @param t 보간 계수 (0~1), MAP_LERP 사용 권장
 */
export function lerpAngle(current: number, target: number, t: number): number {
  const diff = ((target - current + 540) % 360) - 180;
  return (current + diff * t + 360) % 360;
}

/** 사용자 위치(lat, lng)를 코스 폴리라인에 투영해 누적 이동 거리(m) 반환 */
export function projectOnRoute(
  lat: number,
  lng: number,
  coords: CoordinatePoint[],
  cumDist: number[]
): number {
  if (coords.length < 2) return 0;

  const DEG_TO_RAD = Math.PI / 180;
  const cosLat = Math.cos(lat * DEG_TO_RAD);

  let minDist = Infinity;
  let result = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i].longitude * cosLat;
    const ay = coords[i].latitude;
    const bx = coords[i + 1].longitude * cosLat;
    const by = coords[i + 1].latitude;
    const px = lng * cosLat;
    const py = lat;

    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;

    const t = ab2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / ab2)) : 0;

    const closestLon = (ax + t * abx) / cosLat;
    const closestLat = ay + t * aby;
    const d = haversineM(lat, lng, closestLat, closestLon);

    if (d < minDist) {
      minDist = d;
      const segLen = cumDist[i + 1] - cumDist[i];
      result = cumDist[i] + t * segLen;
    }
  }

  return result;
}
