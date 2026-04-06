import { Award, Bookmark, Home, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CompleteRunningSessionResponse } from '@/apis/runningSessions';
import { RunResultMap } from '@/shared/components/Running/RunResultMap';
import { HeartRateSection } from '@/shared/components/Running/HeartRateSection';
import { SplitTable } from '@/shared/components/Running/SplitTable';
import { formatDuration, formatPace } from '@/shared/utils';
import { useNormalRunSessionStore } from '@/stores/NormalRun';
import { CourseReviewModal } from './CourseReviewModal';

type NormalRunResultScreenProps = {
  result: CompleteRunningSessionResponse;
};

export function NormalRunResultScreen({ result }: NormalRunResultScreenProps) {
  const navigate = useNavigate();
  const clearAll = useNormalRunSessionStore((s) => s.clearAll);
  const courseId = useNormalRunSessionStore((s) => s.session?.courseId ?? null);

  const [showReview, setShowReview] = useState(() => courseId !== null);
  const [toastVisible, setToastVisible] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(courseId !== null);

  const handleHome = () => {
    clearAll();
    navigate('/normal-run');
  };

  function handleReviewDone() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  }

  return (
    <>
      <div className="absolute inset-0 bg-secondary-1 overflow-y-auto">
        {courseId !== null && (
          <CourseReviewModal
            isOpen={showReview}
            onClose={() => setShowReview(false)}
            courseId={courseId}
            onDone={handleReviewDone}
          />
        )}
        {toastVisible && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-secondary-3 text-fg-inverse px-5 py-3 rounded-2xl body-r shadow-lg z-50 whitespace-nowrap">
            참여해주셔서 감사합니다
          </div>
        )}
        <div className="flex flex-col gap-4 px-6 pb-10">
          {/* 헤더 */}
          <div className="relative flex flex-col items-center pt-10 pb-2">
            <button
              className="absolute top-10 right-0 p-2"
              aria-label="즐겨찾기 추가 (준비 중)"
              disabled
            >
              <Bookmark size={26} className="text-secondary-5" />
            </button>
            <div className="p-4 rounded-full bg-primary/20 border border-primary/30 mb-4">
              <Award size={40} className="text-primary" />
            </div>
            <h1 className="h2-b text-fg-inverse mb-1">
              러닝 완료!
            </h1>
            <p className="body-r text-secondary-5">
              수고하셨습니다
            </p>
          </div>

          {/* 지도 영역 — GPS 샘플 2개 이상일 때 경로 표시 */}
          <div className="h-40 rounded-2xl overflow-hidden border border-secondary-3">
            {result.gpsSamples.length >= 2 ? (
              <RunResultMap gpsSamples={result.gpsSamples} />
            ) : (
              <div className="h-full bg-secondary-2 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-secondary-5">
                  <MapPin size={24} />
                  <span className="caption-r">GPS 데이터 없음</span>
                </div>
              </div>
            )}
          </div>

          {/* 거리 */}
          <div className="bg-secondary-2 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6" />
            <span className="text-6xl font-bold text-fg-inverse tabular-nums relative z-base">
              {(result.distanceM / 1000).toFixed(2)}
            </span>
            <span className="caption-r text-secondary-5 uppercase tracking-widest mt-1 relative z-base">
              킬로미터
            </span>
          </div>

          {/* 시간 + 평균 페이스 */}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col items-center gap-1 bg-secondary-2 rounded-2xl py-4 px-2">
              <span className="caption-r text-secondary-5">
                시간
              </span>
              <span className="h3-b text-fg-inverse tabular-nums">
                {formatDuration(result.durationSec)}
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1 bg-secondary-2 rounded-2xl py-4 px-2">
              <span className="caption-r text-secondary-5">
                평균 페이스
              </span>
              <span className="h3-b text-fg-inverse tabular-nums">
                {formatPace(result.avgPaceSecPerKm)}
              </span>
            </div>
          </div>

          {/* 심박수 변동 */}
          <HeartRateSection samples={result.healthSamples} />

          {/* 구간별 페이스 */}
          <SplitTable splits={result.splits} />

          {/* 버튼 영역 */}
          <div className="flex flex-col gap-3 pt-2">
            <button
              disabled
              className="w-full py-4 rounded-2xl body-b flex items-center justify-center gap-2 bg-secondary-3 text-secondary-5 cursor-not-allowed"
            >
              <Bookmark size={18} />
              즐겨찾기 추가
            </button>
            <button
              onClick={handleHome}
              className="w-full py-4 rounded-2xl bg-primary text-fg-inverse body-b flex items-center justify-center gap-2"
            >
              <Home size={18} />홈
            </button>
          </div>
        </div>
      </div>

      {courseId !== null && (
        <CourseReviewModal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          courseId={courseId}
          onDone={() => setIsReviewOpen(false)}
        />
      )}
    </>
  );
}
