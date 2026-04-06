function makeStaticLabeledDot(options: {
  dotSize: number;
  borderWidth: number;
  shadow: string;
  pointerEvents?: boolean;
  draggable?: boolean;
}): (label: string, color: string) => HTMLElement {
  return function (label: string, color: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      ${options.pointerEvents === false ? 'pointer-events: none;' : ''}
      user-select: none;
    `;
    if (options.draggable === false) wrapper.draggable = false;

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: ${options.dotSize}px;
      height: ${options.dotSize}px;
      background: ${color};
      border: ${options.borderWidth}px solid white;
      border-radius: 50%;
      box-shadow: ${options.shadow};
    `;

    const tag = document.createElement('span');
    tag.textContent = label;
    tag.style.cssText = `
      background: ${color};
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `;

    wrapper.appendChild(dot);
    wrapper.appendChild(tag);
    return wrapper;
  };
}

/**
 * 레이블 + 색상 도트 마커 DOM 생성 (코스 시작점/도착점 등에 사용)
 */
export const createMarkerContent = makeStaticLabeledDot({
  dotSize: 20,
  borderWidth: 3,
  shadow: '0 2px 6px rgba(0,0,0,0.3)',
  pointerEvents: false,
  draggable: false,
});
