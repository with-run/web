/** 안전권 원 (반지름 30m 녹색) — NormalRun / GhostRun 공통 */
export function createSafeZoneCircle(center: kakao.maps.LatLng): kakao.maps.Circle {
  return new kakao.maps.Circle({
    center,
    radius: 30,
    strokeWeight: 2,
    strokeColor: '#22c55e',
    strokeOpacity: 0.7,
    fillColor: '#22c55e',
    fillOpacity: 0.15,
  });
}

/** 탐색 원 — 반경과 색상을 런타임에 지정 */
export function createExplorationCircle(
  center: kakao.maps.LatLng,
  radius: number,
  color: string
): kakao.maps.Circle {
  return new kakao.maps.Circle({
    center,
    radius,
    strokeWeight: 2,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeStyle: 'solid',
    fillColor: color,
    fillOpacity: 0.1,
  });
}
