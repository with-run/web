function makeSimpleDot(options: {
  size: number;
  color: string;
  borderWidth: number;
  shadow: string;
}): () => HTMLElement {
  return function (): HTMLElement {
    const el = document.createElement('div');
    el.style.cssText = `
      width: ${options.size}px;
      height: ${options.size}px;
      background: ${options.color};
      border: ${options.borderWidth}px solid white;
      border-radius: 50%;
      box-shadow: ${options.shadow};
    `;
    return el;
  };
}

/**
 * 체크포인트 도트 마커 DOM 생성
 * - 10px 회색 원형 도트 (초기: #9ca3af)
 * - el.style.background = '#22c55e' 로 방문 완료 색상으로 변경
 */
export const createCheckpointDotContent = makeSimpleDot({
  size: 10,
  color: '#9ca3af',
  borderWidth: 2,
  shadow: '0 1px 3px rgba(0,0,0,0.3)',
});
