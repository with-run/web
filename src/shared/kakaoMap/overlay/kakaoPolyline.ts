import {
  NEXT_GATE_STROKE_COLOR,
  NEXT_GATE_STROKE_WEIGHT,
  POLYLINE_STROKE_COLOR,
  POLYLINE_STROKE_COLOR_VISITED,
  POLYLINE_STROKE_OPACITY,
  POLYLINE_STROKE_WEIGHT,
} from '@/shared/constants/map';

function makePolyline(options: {
  strokeWeight: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeStyle: kakao.maps.StrokeStyles;
}): (path: kakao.maps.LatLng[]) => kakao.maps.Polyline {
  return (path) =>
    new kakao.maps.Polyline({
      path,
      strokeWeight: options.strokeWeight,
      strokeColor: options.strokeColor,
      strokeOpacity: options.strokeOpacity,
      strokeStyle: options.strokeStyle,
    });
}

/** 기본 코스 경로 폴리라인 (파란색 solid) */
export const createRoutePolyline = makePolyline({
  strokeWeight: POLYLINE_STROKE_WEIGHT,
  strokeColor: POLYLINE_STROKE_COLOR,
  strokeOpacity: POLYLINE_STROKE_OPACITY,
  strokeStyle: 'solid',
});

/** 방문 완료 구간 폴리라인 (녹색 solid) */
export const createVisitedPolyline = makePolyline({
  strokeWeight: POLYLINE_STROKE_WEIGHT,
  strokeColor: POLYLINE_STROKE_COLOR_VISITED,
  strokeOpacity: POLYLINE_STROKE_OPACITY,
  strokeStyle: 'solid',
});

/** 다음 게이트 강조 폴리라인 (주황 shortdash) */
export const createNextGatePolyline = makePolyline({
  strokeWeight: NEXT_GATE_STROKE_WEIGHT,
  strokeColor: NEXT_GATE_STROKE_COLOR,
  strokeOpacity: 0.95,
  strokeStyle: 'shortdash',
});

/** 자유달리기 경로 추적 폴리라인 (빨간색 solid) */
export const createFreeRunTracePolyline = makePolyline({
  strokeWeight: 6,
  strokeColor: '#FF3B3B',
  strokeOpacity: 0.9,
  strokeStyle: 'solid',
});
