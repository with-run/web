function makeRunnerDotMarker(options: {
  color: string;
  haloColor: string;
}): () => HTMLElement {
  return function (): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 16px;
      height: 16px;
      background: ${options.color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 6px ${options.haloColor}, 0 2px 4px rgba(0,0,0,0.3);
    `;

    wrapper.appendChild(dot);
    return wrapper;
  };
}

function makeRunnerDotMarkerWithCone(options: {
  color: string;
  haloColor: string;
}): () => { element: HTMLElement; coneEl: HTMLElement } {
  return function (): { element: HTMLElement; coneEl: HTMLElement } {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: relative;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // 방향 삼각형 (CSS border trick)
    const cone = document.createElement('div');
    cone.style.cssText = `
      position: absolute;
      left: calc(50% - 8px);
      bottom: 50%;
      transform-origin: 8px 18px;
      transform: rotate(0deg);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 18px solid ${options.haloColor};
      opacity: 0;
      transition: opacity 0.3s;
    `;

    const dot = document.createElement('div');
    dot.style.cssText = `
      position: relative;
      z-index: 1;
      width: 16px;
      height: 16px;
      background: ${options.color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 0 0 6px ${options.haloColor}, 0 2px 4px rgba(0,0,0,0.3);
    `;

    wrapper.appendChild(cone);
    wrapper.appendChild(dot);

    return { element: wrapper, coneEl: cone };
  };
}

/**
 * 고스트 러너 위치 마커 DOM 생성
 * - 오렌지 도트 (16px), cone 없음
 */
export const createGhostMarkerContent = makeRunnerDotMarker({
  color: '#F97316',
  haloColor: 'rgba(249,115,22,0.2)',
});

/**
 * 현재 사용자 위치 마커 DOM 생성
 * - 파란 도트 (16px) + 방향 cone (삼각형)
 * - coneEl.style.transform = `rotate(Xdeg)` 로 방향 제어
 * - coneEl.style.opacity = '0.75' 로 표시 (GPS 정확도 확보 후)
 */
export const createUserMarkerContent = makeRunnerDotMarkerWithCone({
  color: '#3B82F6',
  haloColor: 'rgba(59,130,246,0.5)',
});
