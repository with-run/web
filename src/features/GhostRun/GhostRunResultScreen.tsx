import {
  Activity,
  Award,
  Home,
  MapPin,
  Swords,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type {
  CompleteRunningSessionResponse,
  HealthSample,
} from '@/apis/runningSessions';
import { RunResultMap } from '@/shared/components/Running/RunResultMap';
import { cn } from '@/shared/utils';
import { useGhostRunSessionStore } from '@/stores/GhostRun';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(
      2,
      '0'
    )}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function HeartRateSection({ samples }: { samples: HealthSample[] }) {
  const rates = samples.map((s) => s.heartRate).filter((r) => r > 0);
  if (rates.length === 0) return null;

  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);

  const W = 300;
  const H = 64;
  const PAD = 4;
  const points =
    rates.length >= 2
      ? rates
          .map((hr, i) => {
            const x = PAD + (i / (rates.length - 1)) * (W - PAD * 2);
            const y = H - PAD - ((hr - min) / (max - min || 1)) * (H - PAD * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ')
      : null;

  return (
    <div className="bg-secondary-2 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-primary" />
        <span className="caption-b text-fg-inverse">
          심박수 변동
        </span>
      </div>
      <div className="flex gap-3 mb-4">
        {[
          { label: '최소', value: String(min), highlight: false },
          { label: '평균', value: String(avg), highlight: true },
          { label: '최대', value: String(max), highlight: false },
        ].map(({ label, value, highlight }) => (
          <div
            key={label}
            className="flex-1 flex flex-col items-center gap-1 bg-secondary-3 rounded-xl py-3"
          >
            <span className="caption-r text-secondary-5">
              {label}
            </span>
            <span
              className={cn(
                'h3-b',
                highlight ? 'text-primary' : 'text-fg-inverse'
              )}
            >
              {value}
            </span>
            <span className="caption-r text-secondary-5">
              bpm
            </span>
          </div>
        ))}
      </div>
      {points && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: 64 }}
          preserveAspectRatio="none"
        >
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

type GhostRunResultScreenProps = {
  result: CompleteRunningSessionResponse;
};

const STATUS_CONFIG = {
  WIN: {
    label: '승리!',
    emoji: '🏆',
    bg: 'bg-black',
    border: 'border-primary-1/[0.4]',
    textColor: 'text-primary-1',
    icon: <Trophy size={48} className="text-primary-1" />,
  },
  LOSE: {
    label: '패배',
    emoji: '💪',
    bg: 'bg-black',
    border: 'border-error/[0.35]',
    textColor: 'text-error',
    icon: <Swords size={48} className="text-error" />,
  },
  DRAW: {
    label: '무승부',
    emoji: '🤝',
    bg: 'bg-black',
    border: 'border-secondary-4',
    textColor: 'text-fg-inverse',
    icon: <Swords size={48} className="text-secondary-5" />,
  },
};

export function GhostRunResultScreen({ result }: GhostRunResultScreenProps) {
  const navigate = useNavigate();
  const clearAll = useGhostRunSessionStore((s) => s.clearAll);

  const ghostResult = result.ghostRunningResult;
  const [modalDismissed, setModalDismissed] = useState(false);
  const showModal = !!ghostResult && !modalDismissed;

  const handleHome = () => {
    clearAll();
    navigate('/ghost-run');
  };

  const avgSplitSec =
    result.splits.length > 0
      ? result.splits.reduce((sum, s) => sum + s.splitPaceSecPerKm, 0) /
        result.splits.length
      : 0;

  const config = ghostResult ? STATUS_CONFIG[ghostResult.resultStatus] : null;

  return (
    <div className="absolute inset-0 bg-secondary-1 overflow-y-auto">
      <div className="flex flex-col gap-4 px-6 pb-10">
        {/* 헤더 */}
        <div className="flex flex-col items-center pt-10 pb-2">
          <div className="p-4 rounded-full bg-primary/20 border border-primary/30 mb-4">
            <Award size={40} className="text-primary" />
          </div>
          <h1 className="h2-b text-fg-inverse mb-1">
            고스트런 완료!
          </h1>
          <p className="body-r text-secondary-5">
            수고하셨습니다
          </p>
        </div>

        {/* 지도 */}
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
        {result.splits.length > 0 && (
          <div className="bg-secondary-2 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Timer size={16} className="text-primary" />
              <span className="caption-b text-fg-inverse">
                구간별 페이스 (1km)
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border border-secondary-3">
              <table className="w-full">
                <thead className="bg-secondary-3">
                  <tr>
                    <th className="px-4 py-2 text-left caption-r text-secondary-5 font-normal">
                      구간
                    </th>
                    <th className="px-4 py-2 text-left caption-r text-secondary-5 font-normal">
                      페이스
                    </th>
                    <th className="px-4 py-2 text-left caption-r text-secondary-5 font-normal">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-3">
                  {result.splits.map((split) => (
                    <tr key={split.splitIndex}>
                      <td className="px-4 py-3 caption-m text-fg-inverse">
                        {split.splitIndex}km
                      </td>
                      <td className="px-4 py-3 caption-m text-primary font-bold">
                        {formatPace(split.splitPaceSecPerKm)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            split.splitPaceSecPerKm < avgSplitSec
                              ? 'bg-success'
                              : 'bg-warning'
                          )}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 홈 버튼 */}
        <div className="pt-2">
          <button
            onClick={handleHome}
            className="w-full py-4 rounded-2xl bg-primary text-fg-inverse body-b flex items-center justify-center gap-2"
          >
            <Home size={18} />홈
          </button>
        </div>
      </div>

      {/* WIN/LOSE/DRAW 모달 */}
      {showModal && config && ghostResult && (
        <div className="absolute inset-0 z-modal flex items-center justify-center bg-black/60 px-6">
          <div
            className={`relative w-full max-w-sm rounded-3xl border ${config.border} ${config.bg} p-8 flex flex-col items-center gap-5`}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setModalDismissed(true)}
              className="absolute right-4 top-4 text-secondary-5"
              aria-label="닫기"
            >
              <X size={20} />
            </button>

            {/* 아이콘 */}
            {config.icon}

            {/* 결과 텍스트 */}
            <div className="flex flex-col items-center gap-1">
              <span
                className={`text-5xl font-bold tabular-nums ${config.textColor}`}
              >
                {config.label}
              </span>
              <span className="text-3xl">{config.emoji}</span>
            </div>

            {/* 획득 포인트 */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="caption-r text-secondary-5">
                획득 포인트
              </span>
              <span className="h2-b text-primary-1">
                +{ghostResult.point.toLocaleString()}P
              </span>
            </div>

            {/* 시간 차 / 거리 차 */}
            <div className="flex w-full gap-3">
              <div className="flex-1 flex flex-col items-center gap-0.5 rounded-2xl bg-secondary-2 py-3">
                <span className="caption-r text-secondary-5">
                  시간 차
                </span>
                <span className="body-l-b text-fg-inverse tabular-nums">
                  {ghostResult.timeGapSec}초
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center gap-0.5 rounded-2xl bg-secondary-2 py-3">
                <span className="caption-r text-secondary-5">
                  거리 차
                </span>
                <span className="body-l-b text-fg-inverse tabular-nums">
                  {ghostResult.distanceGapM}m
                </span>
              </div>
            </div>

            {/* 확인 버튼 */}
            <button
              onClick={() => setModalDismissed(true)}
              className="w-full py-3 rounded-2xl bg-primary text-fg-inverse body-b"
            >
              결과 확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
