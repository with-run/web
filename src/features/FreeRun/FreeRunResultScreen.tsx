import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Home, Check, UploadCloud, MapPin } from 'lucide-react';
import { cn, formatDuration, formatPace } from '@/shared/utils';
import { CourseShareModal } from './CourseShareModal';
import { RunResultMap } from '@/shared/components/Running/RunResultMap';
import { HeartRateSection } from '@/shared/components/Running/HeartRateSection';
import { SplitTable } from '@/shared/components/Running/SplitTable';
import type { RunningResult } from './FreeRunningScreen';
import { useAuthStore } from '@/stores/Auth';

interface FreeRunResultScreenProps {
  result: RunningResult | null;
  courseId: number | null;
  runningSessionId: number | null;
  onCourseRegistered: (courseId: number) => void;
}

export function FreeRunResultScreen({
  result,
  courseId,
  runningSessionId,
  onCourseRegistered,
}: FreeRunResultScreenProps) {
  const navigate = useNavigate();
  const nickname = useAuthStore((s) => s.user?.nickname ?? '러너');
  const [showShareModal, setShowShareModal] = useState(false);

  const durationSec = result?.durationSec ?? 0;
  const distanceM = result?.distanceM ?? 0;
  const caloriesKcal = result?.caloriesKcal ?? 0;
  const avgPaceSecPerKm = result?.avgPaceSecPerKm ?? 0;
  const gpsSamples = result?.gpsSamples ?? [];
  const splits = result?.splits ?? [];
  const healthSamples = result?.healthSamples ?? [];

  const time = formatDuration(durationSec);
  const distance = (distanceM / 1000).toFixed(2);
  const pace = formatPace(avgPaceSecPerKm);

  return (
    <div className="absolute inset-0 bg-secondary-1">
      <div
        className={cn(
          'absolute inset-0 flex flex-col',
          showShareModal ? 'overflow-hidden' : 'overflow-y-auto'
        )}
      >
        {/* 헤더 */}
        <div className="relative flex flex-col items-center pt-10 pb-6 px-6">
          <div className="p-4 rounded-full bg-primary/20 border border-primary/30 mb-4">
            <Award size={40} className="text-primary" />
          </div>
          <h1 className="h2-b text-fg-inverse mb-1">
            수고하셨습니다, {nickname}님!
          </h1>
        </div>

        {/* 지도 영역 — 러닝 경로 폴리라인 */}
        <div className="mx-6 mb-4 h-40 rounded-2xl overflow-hidden border border-secondary-3">
          {gpsSamples.length >= 2 ? (
            <RunResultMap gpsSamples={gpsSamples} />
          ) : (
            <div className="h-full bg-secondary-2 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-secondary-5">
                <MapPin size={24} />
                <span className="caption-r">GPS 데이터 없음</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 space-y-4 pb-8">
          {/* 이동 거리 - 크게 표시 */}
          <div className="bg-secondary-2 rounded-2xl p-6 flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-6 -mt-6" />
            <span className="text-6xl font-bold text-fg-inverse tabular-nums relative z-base">
              {distance}
            </span>
            <span className="caption-r text-secondary-5 uppercase tracking-widest mt-1 relative z-base">
              킬로미터
            </span>
          </div>

          {/* 시간, 평균 페이스, 칼로리 */}
          <div className="flex gap-3">
            {[
              { label: '시간', value: time, unit: '' },
              { label: '평균 페이스', value: pace, unit: '/km' },
              { label: '칼로리', value: String(caloriesKcal), unit: 'kcal' },
            ].map(({ label, value, unit }) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center gap-1 bg-secondary-2 rounded-2xl py-4 px-2"
              >
                <span className="caption-r text-secondary-5">
                  {label}
                </span>
                <span className="h3-b text-fg-inverse">
                  {value}
                </span>
                {unit && (
                  <span className="caption-r text-secondary-5">
                    {unit}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 심박수 변동 */}
          <HeartRateSection samples={healthSamples} />

          {/* 구간별 페이스 */}
          <SplitTable splits={splits} />

          {/* 코스 등록 버튼 */}
          <button
            onClick={() => setShowShareModal(true)}
            disabled={courseId !== null}
            className={cn(
              'w-full py-4 rounded-2xl body-b flex items-center justify-center gap-2 transition-colors',
              courseId !== null
                ? 'bg-secondary-4 text-secondary-5 cursor-default'
                : 'bg-primary/20 border border-primary/30 text-primary'
            )}
          >
            {courseId !== null ? (
              <Check size={18} />
            ) : (
              <UploadCloud size={18} />
            )}
            {courseId !== null ? '등록 완료' : '코스 등록'}
          </button>

          {/* 홈으로 버튼 */}
          <button
            onClick={() => navigate('/free-run')}
            className="w-full py-4 rounded-2xl bg-primary text-fg-inverse body-b flex items-center justify-center gap-2"
          >
            <Home size={18} />
            홈으로
          </button>
        </div>
      </div>

      <CourseShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        runningSessionId={runningSessionId}
        onRegistered={onCourseRegistered}
        gpsSamples={gpsSamples}
      />
    </div>
  );
}
