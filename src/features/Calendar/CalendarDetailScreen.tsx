import { Activity, Timer, MapPin } from 'lucide-react';
import { useRef } from 'react';

import { CalendarDetailHeader } from './CalendarDetailHeader';

import { cn } from '@/shared/utils';
import { formatDuration, formatPace, formatStartTime } from '@/shared/utils';
import { useRunResultMap } from '@/shared/hooks/Running/useRunResultMap';
import type { RunningSessionDetailResponse, GhostRunningResult } from '@/apis/runningSessions';
import type { GpsSample, HealthSample, SplitResult } from '@/apis/runningSessions';

const GHOST_RESULT_CONFIG = {
  WIN:  { label: '승리', cardClass: 'border-success bg-success/[0.08]', labelClass: 'text-success' },
  LOSE: { label: '패배', cardClass: 'border-error bg-error/[0.08]',   labelClass: 'text-error' },
  DRAW: { label: '무승부', cardClass: 'border-border-default bg-surface-subtle', labelClass: 'text-fg-secondary' },
} as const;

function formatGapDistance(m: number): string {
  if (m === 0) return '0m';
  return m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${m}m`;
}

function GhostResultCard({ result }: { result: GhostRunningResult }) {
  const config = GHOST_RESULT_CONFIG[result.resultStatus];
  const isWin = result.resultStatus === 'WIN';
  const isLose = result.resultStatus === 'LOSE';

  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-3', config.cardClass)}>
      {/* 결과 라벨 */}
      <div className="flex items-center justify-between">
        <span className={cn('h3-b', config.labelClass)}>{config.label}</span>
        <span className="caption-r text-fg-secondary">고스트런</span>
      </div>

      {/* 수치 2개 */}
      <div className="flex gap-2">
        {[
          {
            label: '거리 차',
            value: formatGapDistance(result.distanceGapM),
            sub: isWin ? '더 달림' : isLose ? '덜 달림' : '-',
          },
          {
            label: '획득 포인트',
            value: `+${result.point}`,
            sub: 'pt',
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-1 bg-surface-default rounded-lg py-3"
          >
            <span className="caption-r text-fg-secondary">{label}</span>
            <span className="body-b text-fg-primary tabular-nums">{value}</span>
            <span className="caption-r text-fg-secondary">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// GPS 경로 지도 (div 하나 만들고 ref 연결)
function DetailMap({ gpsSamples }: { gpsSamples: GpsSample[] }) {
  // div 가리키는 ref 만들기 (지도 라이브러리에서 이 div에 지도를 그릴 예정)
  const containerRef = useRef<HTMLDivElement>(null);
  useRunResultMap(containerRef, gpsSamples);
  // 빈 div 반환 (지도 라이브러리가 이 div에 지도를 그릴 예정)
  return <div ref={containerRef} className="w-full h-full" />;
}

// 심박수 폴리라인 섹션
function HeartRateSection({ samples }: { samples: HealthSample[] }) {
  // healthSamples에서 heartRate만 추출해서 배열로 만들기 (0 이하 값은 제외)
  const rates = samples.map((s) => s.heartRate).filter((r) => r > 0);
  // 워치 연동 안되어있거나, 심박수 데이터 없으면 null 반환해서 이 섹션 자체를 숨김
  if (rates.length === 0) return null;

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

  // SVG 좌표 변환
  const W = 300;
  const H = 64;
  const PAD = 4;
  const points =
    rates.length >= 2
      ? rates
          .map((hr, i) => {
            // x: 시간축 (왼쪽 -> 오른쪽, 균등 간격)
            const x = PAD + (i / (rates.length - 1)) * (W - PAD * 2);
            // y: 심박수축 (높을수록 위쪽)
            // SVG는 y가 위 -> 아래라 H에서 빼기 
            const y = H - PAD - ((hr - min) / (max - min || 1)) * (H - PAD * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-default p-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <span className="caption-b text-fg-primary">심박수 변동</span>
      </div>
      <div className="flex gap-3">
        {[
          { label: '최소', value: String(min), highlight: false },
          { label: '평균', value: String(avg), highlight: true },
          { label: '최대', value: String(max), highlight: false },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-1 bg-surface-subtle rounded-lg py-3"
          >
            <span className="caption-r text-fg-secondary">{label}</span>
            <span className={cn('h3-b', highlight ? 'text-primary' : 'text-fg-primary')}>
              {value}
            </span>
            <span className="caption-r text-fg-secondary">bpm</span>
          </div>
        ))}
      </div>
      {points && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }} preserveAspectRatio="none">
          {/* polyline으로 연결 */}
          <polyline
            points={points}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}

// 구간별 페이스 섹션
// SplitResult 타입의 배열을 받음
// splitIndex -> 몇 번째 1km 구간인지 (1부터 시작)
// splitPaceSecPerKm -> 해당 구간의 페이스 (초/킬로미터)
function SplitsSection({ splits, avgPaceSecPerKm }: { splits: SplitResult[]; avgPaceSecPerKm: number }) {
  // 구간 데이터 없으면 섹션 전체 숨김
  if (splits.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-default bg-surface-default p-4">
      <div className="flex items-center gap-2">
        <Timer size={16} className="text-primary" />
        <span className="caption-b text-fg-primary">구간별 페이스 (1km)</span>
      </div>
      <div className="rounded-lg overflow-hidden border border-border-default">
        <table className="w-full">
          <thead className="bg-surface-subtle">
            <tr>
              <th className="px-3 py-2 text-left caption-r text-fg-secondary font-normal">구간</th>
              <th className="px-3 py-2 text-left caption-r text-fg-secondary font-normal">페이스</th>
              <th className="px-3 py-2 text-left caption-r text-fg-secondary font-normal">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {splits.map((split) => (
              <tr key={split.splitIndex}>
                <td className="px-3 py-3 caption-m text-fg-primary">
                  {split.splitDistanceM < 1000
                    ? `${parseFloat((split.splitDistanceM / 1000).toFixed(2))}km`
                    : `${split.splitIndex}km`}
                </td>
                <td className="px-3 py-3 caption-m text-primary font-bold">
                  {formatPace(split.splitPaceSecPerKm)}
                </td>
                <td className="px-3 py-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      split.splitPaceSecPerKm < avgPaceSecPerKm
                        // 평균 페이스보다 빠르면 초록, 느리면 노랑
                        ? 'bg-success'
                        : 'bg-warning',
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


type CalendarDetailScreenProps = {
  detail: RunningSessionDetailResponse;
};

export function CalendarDetailScreen({ detail }: CalendarDetailScreenProps) {

  // "2026-03-12T06:30:00" → "2026년 3월 12일"
  const dateLabel = (() => {
    const parts = detail.startedAt.slice(0, 10).split('-');
    return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
  })();

  // "2026-03-12T06:30:00" → "오전 6:30"
  const timeLabel = formatStartTime(detail.startedAt);

  // "2026-03-12T06:30:00" → "목요일 새벽 러닝"
  const runningLabel = (() => {
    const date = new Date(detail.startedAt);
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const hour = date.getHours();
    const slot = hour < 6 ? '새벽' : hour < 12 ? '오전' : hour < 18 ? '오후' : '저녁';
    return `${days[date.getDay()]} ${slot} 러닝`;
  })();

  return (
    <div className="absolute inset-0 flex flex-col bg-surface-subtle">
      {/* 상단 헤더 */}
      <CalendarDetailHeader />

      {/* 스크롤 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 px-5 pb-10 pt-4">

        {/* 날짜 / 시간 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="h3-b text-fg-primary">{dateLabel}</span>
            <span className="body-r text-fg-secondary">-</span>
            <span className="body-r text-fg-secondary">{timeLabel}</span>
          </div>
          <span className="body-r text-fg-secondary">{runningLabel}</span>
        </div>

        {/* 고스트런 결과 */}
        {detail.ghostRunningResult && (
          <GhostResultCard result={detail.ghostRunningResult} />
        )}

        {/* 지도 */}
        <div className="h-40 rounded-xl overflow-hidden border border-border-default">
          {detail.gpsSamples.length >= 2 ? (
            <DetailMap gpsSamples={detail.gpsSamples} />
          ) : (
            <div className="h-full bg-surface-subtle flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-fg-secondary">
                <MapPin size={24} />
                <span className="caption-r">GPS 데이터 없음</span>
              </div>
            </div>
          )}
        </div>

        {/* 거리 */}
        <div className="rounded-xl border border-border-default bg-surface-default p-6 flex flex-col items-center">
          <span className="text-6xl font-bold text-fg-primary tabular-nums">
            {(detail.distanceM / 1000).toFixed(2)}
          </span>
          <span className="caption-r text-fg-secondary uppercase tracking-widest mt-1">
            킬로미터
          </span>
        </div>

        {/* 시간 + 페이스 */}
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col items-center gap-1 rounded-xl border border-border-default bg-surface-default py-4 px-2">
            <span className="h3-b text-fg-primary tabular-nums">
              {formatDuration(detail.durationSec)}
            </span>
            <span className="caption-r text-fg-secondary">시간</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 rounded-xl border border-border-default bg-surface-default py-4 px-2">
            <span className="h3-b text-fg-primary tabular-nums">
              {formatPace(detail.avgPaceSecPerKm)}
            </span>
            <span className="caption-r text-fg-secondary">평균 페이스</span>
          </div>
        </div>

        {/* 칼로리 + 고도 */}
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col items-center gap-1 rounded-xl border border-border-default bg-surface-default py-4 px-2">
            <span className="h3-b text-fg-primary tabular-nums">
              {detail.caloriesKcal === 0 ? '--' : detail.caloriesKcal}
            </span>
            <span className="caption-r text-fg-secondary">칼로리</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1 rounded-xl border border-border-default bg-surface-default py-4 px-2">
            <span className="h3-b text-fg-primary tabular-nums">
              {detail.elevationGainM}<span className="caption-r text-fg-secondary ml-0.5">m</span>
            </span>
            <span className="caption-r text-fg-secondary">고도 상승</span>
          </div>
        </div>

        {/* 심박수 변동 */}
        <HeartRateSection samples={detail.healthSamples} />

        {/* 구간별 페이스 */}
        <SplitsSection splits={detail.splits} avgPaceSecPerKm={detail.avgPaceSecPerKm} />
      </div>
      </div>
    </div>
  );
}
