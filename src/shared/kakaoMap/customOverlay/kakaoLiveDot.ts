function makeLiveLabeledDot(options: {
  dotSize: number;
  borderWidth: number;
  haloColor: string;
}): (label: string, color: string) => HTMLElement {
  return function (label: string, color: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:4px;';

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: ${options.dotSize}px;
      height: ${options.dotSize}px;
      background: ${color};
      border: ${options.borderWidth}px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 6px ${options.haloColor}, 0 2px 4px rgba(0,0,0,0.3);
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
 * 사용자 위치 도트 + 레이블 마커 DOM 생성 (러닝 결과 상세 화면용)
 * - 16px 원형 도트 + 하단 레이블 태그 + halo(글로우 링) 효과
 */
export const createUserDotContent = makeLiveLabeledDot({
  dotSize: 16,
  borderWidth: 2.5,
  haloColor: 'rgba(59,130,246,0.2)',
});
