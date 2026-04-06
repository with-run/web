import { useState } from 'react';
import { FreeRunScreen } from '@/features/FreeRun';
import { RunningGuideModal } from '@/shared/components/RunningGuideModal';

export function FreeRunPage() {
  const [showGuide, setShowGuide] = useState(() => {
    // 초기 렌더에서 바로 localStorage 를 읽어 첫 진입 여부를 결정하면 effect 없이도 가이드 노출을 안정적으로 맞출 수 있다.
    if (typeof window === 'undefined') {
      return false;
    }

    return !window.localStorage.getItem('freerun-guide-seen');
  });

  function handleCloseGuide() {
    localStorage.setItem('freerun-guide-seen', 'true');
    setShowGuide(false);
  }

  return (
    <>
      <FreeRunScreen />
      <RunningGuideModal
        isOpen={showGuide}
        onClose={handleCloseGuide}
        steps={[
          {
            title: '자유 러닝',
            content:
              '코스 제한 없이 원하는 곳 어디서든 자유롭게 달릴 수 있습니다.',
          },
          {
            title: '러닝 시작',
            content: '화면 중앙의 버튼을 탭하면 러닝이 시작됩니다.',
          },
          {
            title: '러닝 분석',
            content:
              '러닝이 끝나면 페이스, 소모 칼로리, 고도 등 상세한 데이터를 분석해드립니다.',
          },
        ]}
      />
    </>
  );
}
