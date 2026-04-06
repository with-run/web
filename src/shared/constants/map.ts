/** 지도 기본 중심 좌표 (서울 시청) */
export const MAP_DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

/** 마커 방향 애니메이션 보간 계수 (60fps 기준 ~1초에 99% 수렴) */
export const MAP_LERP = 0.12;

/** 코스 탐색 기본 반경 (m) */
export const COURSE_SEARCH_DEFAULT_RADIUS_M = 3000;

/** 경로 폴리라인 — 미방문 구간 */
export const POLYLINE_STROKE_WEIGHT = 5;
export const POLYLINE_STROKE_COLOR = '#4F80FF';
export const POLYLINE_STROKE_OPACITY = 0.9;

/** 경로 폴리라인 — 방문 완료 구간 */
export const POLYLINE_STROKE_COLOR_VISITED = '#22c55e';

/** 다음 게이트 강조 폴리라인 */
export const NEXT_GATE_STROKE_COLOR = '#f97316';
export const NEXT_GATE_STROKE_WEIGHT = 4;

/** 지리 계산 상수 */
export const M_PER_DEG_LAT = 110_540; // 위도 1도당 미터 (타원체 보정값)
export const M_PER_DEG_LON_EQUATOR = 111_320; // 적도 기준 경도 1도당 미터

/** 경로 위 방향 화살표 개수 */
export const ROUTE_ARROW_COUNT = 15;
