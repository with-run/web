// 러닝 중 화면 (통계 + 타이머 + 일시정지/종료 컨트롤)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, Square } from 'lucide-react';
import { cn } from '@/shared/utils';
import { useFreeRunning } from '@/hooks/FreeRun/useFreeRunning';
import { useBridgeDataStore } from '@/bridge';
import { completeRunningSession } from '@/apis';
import type { GpsSample, HealthSample, SplitResult } from '@/apis';
import { FreeRunningMap } from './FreeRunningMap';
import { useFreeRunSessionStore } from '@/stores/FreeRun';
import { stopWatchRunSync } from '@/shared/utils/watchRunBridge';

export interface RunningResult {
  durationSec: number;
  distanceM: number;
  caloriesKcal: number;
  avgPaceSecPerKm: number;
  gpsSamples: GpsSample[];
  splits: SplitResult[];
  healthSamples: HealthSample[];
}

interface FreeRunningScreenProps {
  runningSessionId: number | null;
  onFinish: (result: RunningResult) => void;
}

interface StatItemProps {
  label: string;
  value: string;
  sub?: string;
}

function StatItem({ label, value, sub }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="body-r tracking-wide text-secondary-5">
        {label}
      </span>
      <span className="h2-b tabular-nums text-fg-inverse [text-shadow:0_2px_8px_hsl(var(--black)/0.35)]">
        {value}
      </span>
      {sub && (
        <span className="body-r font-semibold text-secondary-5">
          {sub}
        </span>
      )}
    </div>
  );
}

export function FreeRunningScreen({
  runningSessionId,
  onFinish,
}: FreeRunningScreenProps) {
  const navigate = useNavigate();
  const {
    time,
    distance,
    pace,
    calories,
    heartRate,
    isPaused,
    togglePause,
    getCollectedData,
  } = useFreeRunning();
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);
  const clearAll = useFreeRunSessionStore((s) => s.clearAll);

  const [isEnding, setIsEnding] = useState(false);
  const completedRef = useRef(false);

  // "latest ref" 패턴: cleanup 클로저에서 최신값 접근
  const latestGetCollectedDataRef = useRef(getCollectedData);
  latestGetCollectedDataRef.current = getCollectedData;

  const latestGpsLocationRef = useRef(gpsLocation);
  latestGpsLocationRef.current = gpsLocation;

  const latestRunningSessionIdRef = useRef(runningSessionId);
  latestRunningSessionIdRef.current = runningSessionId;

  // 비정상 종료 처리 (앱 이탈 시 세션 종료 API fire-and-forget)
  // DEV: StrictMode 이중 마운트로 인한 오발을 완전히 차단하기 위해 skip
  //      (비정상 종료 처리는 프로덕션 모바일에서만 필요)
  useEffect(() => {
    if (import.meta.env.DEV) return;
    return () => {
      if (completedRef.current) return;
      const sessionId = latestRunningSessionIdRef.current;
      if (!sessionId) return;
      const data = latestGetCollectedDataRef.current();
      const gps = latestGpsLocationRef.current;
      void stopWatchRunSync();
      completeRunningSession(sessionId, {
        completeState: 'FAIL',
        ...data,
        endLatitude: gps?.latitude ?? 0,
        endLongitude: gps?.longitude ?? 0,
        distanceGapM: 0,
      }).catch(() => {}); // fire-and-forget
    };
  }, []);

  const handleStopRunning = useCallback(async () => {
    if (isEnding || !runningSessionId) return;
    setIsEnding(true);
    void stopWatchRunSync();
    try {
      const data = getCollectedData();
      const res = await completeRunningSession(runningSessionId, {
        completeState: 'SUCCESS',
        ...data,
        endLatitude: gpsLocation?.latitude ?? 0,
        endLongitude: gpsLocation?.longitude ?? 0,
        distanceGapM: 0,
      });
      completedRef.current = true;
      onFinish({
        durationSec: res.data.durationSec,
        distanceM: res.data.distanceM,
        caloriesKcal: res.data.caloriesKcal,
        avgPaceSecPerKm: res.data.avgPaceSecPerKm,
        gpsSamples: res.data.gpsSamples,
        splits: res.data.splits,
        healthSamples: res.data.healthSamples,
      });
    } catch {
      clearAll();
      navigate('/free-run');
    } finally {
      setIsEnding(false);
    }
  }, [
    isEnding,
    runningSessionId,
    getCollectedData,
    gpsLocation,
    onFinish,
    clearAll,
    navigate,
  ]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-surface-inverse">
      <div className="shrink-0 border-b border-secondary-3 px-6 py-4">
        <div className="grid grid-cols-4 gap-2">
          <StatItem label="거리" value={distance} sub="km" />
          <StatItem label="페이스" value={pace} />
          <StatItem label="칼로리" value={String(calories)} sub="kcal" />
          <StatItem label="심박수" value={String(heartRate)} sub="bpm" />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <FreeRunningMap />
      </div>

      <div className="shrink-0 border-t border-secondary-3 px-6 pb-8 pt-4">
        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center gap-2">
            <span
              className={cn(
                'font-bold leading-none tabular-nums text-fg-inverse',
                time.length > 5 ? 'text-7xl' : 'text-8xl'
              )}
            >
              {time}
            </span>
            <span className="caption-r tracking-[0.2em] text-secondary-5 uppercase">
              Total Time
            </span>
          </div>

          <div className="relative flex w-full items-center justify-center">
            <button
              onClick={togglePause}
              disabled={isEnding}
              className="z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary-1 text-fg-inverse shadow-soft-lg disabled:opacity-50"
              aria-label={isPaused ? '러닝 재개' : '일시정지'}
            >
              {isPaused ? (
                <Play size={30} fill="currentColor" />
              ) : (
                <Pause size={30} fill="currentColor" />
              )}
            </button>

            <button
              onClick={handleStopRunning}
              disabled={isEnding}
              className={cn(
                'absolute flex h-14 w-14 items-center justify-center rounded-full border border-secondary-4 bg-secondary-3 text-fg-inverse shadow-md transition-all duration-300',
                isPaused
                  ? 'translate-x-20 opacity-100'
                  : 'pointer-events-none translate-x-[50px] opacity-0'
              )}
              aria-label={isEnding ? '종료 중...' : '러닝 종료'}
            >
              <Square size={22} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
