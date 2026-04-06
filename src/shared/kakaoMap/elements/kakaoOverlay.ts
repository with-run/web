function makeRouteArrowElement(options?: {
  width?: number;
  height?: number;
  fillColor?: string;
  fillOpacity?: number;
}): (bearingDeg: number) => HTMLElement {
  const w = options?.width ?? 10;
  const h = options?.height ?? 14;
  const fill = options?.fillColor ?? 'white';
  const opacity = options?.fillOpacity ?? 0.8;

  return function (bearingDeg: number): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = 'pointer-events:none;';
    el.innerHTML = `<svg viewBox="0 0 10 14" width="${w}" height="${h}" style="display:block;transform:rotate(${bearingDeg}deg);transform-origin:center"><path d="M5 0 L10 14 L5 9 L0 14Z" fill="${fill}" fill-opacity="${opacity}"/></svg>`;
    return el;
  };
}

function makeDistanceBadgeElement(options?: {
  initialText?: string;
}): () => HTMLElement {
  const initialText = options?.initialText ?? '0m';

  return function (): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(17,24,39,0.86);
      color: white;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
    `;
    el.textContent = initialText;
    return el;
  };
}

/**
 * 경로 위 방향 화살표 CustomOverlay DOM 생성
 * @param bearingDeg 화살표가 가리킬 방향 (0 = 북, 시계방향 증가)
 */
export const createRouteArrowElement = makeRouteArrowElement({
  width: 10,
  height: 14,
  fillColor: 'white',
  fillOpacity: 0.8,
});

/**
 * 거리 배지 CustomOverlay DOM 생성 (출발점~현재 위치 점선 중간에 표시)
 * - pill 형태, 초기 textContent = '0m'
 * - el.textContent = '123m' 으로 거리 업데이트
 */
export const createDistanceBadgeElement = makeDistanceBadgeElement({
  initialText: '0m',
});
