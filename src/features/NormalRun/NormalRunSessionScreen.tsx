import { Pause, Play, Square } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { NormalRunMap } from './NormalRunMap';
import { useNormalRunning } from '@/hooks/NormalRun/useNormalRunning';
import { useVoiceGuidance } from '@/shared/hooks/Running/useVoiceGuidance';
import { cn } from '@/shared/utils';
import type { CourseDetail } from '@/apis/course';
import { completeRunningSession } from '@/apis/runningSessions';
import { useNormalRunSessionStore } from '@/stores/NormalRun';
import { useBridgeDataStore } from '@/bridge';
import { pickRandomVoiceCue, playVoiceCueOnBridge } from '@/shared/utils/voiceCue';
import { stopWatchRunSync } from '@/shared/utils/watchRunBridge';

interface StatItemProps {
  label: string;
  value: string;
  valueClassName?: string;
  sub?: React.ReactNode;
}

function StatItem({ label, value, valueClassName, sub }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="body-r tracking-wide text-secondary-5">
        {label}
      </span>
      <span
        className={cn(
          'h2-b tabular-nums [text-shadow:0_2px_8px_hsl(var(--black)/0.35)]',
          valueClassName ?? 'text-fg-inverse'
        )}
      >
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

type NormalRunSessionScreenProps = {
  courseDetail: CourseDetail;
};

export function NormalRunSessionScreen({
  courseDetail,
}: NormalRunSessionScreenProps) {
  const navigate = useNavigate();

  // forceStopRef: handleStopRunning ↔ useNormalRunning 순환 의존 해소
  const forceStopRef = useRef<() => void>(() => {});
  const autoCompleteRef = useRef<() => void>(() => {});

  const {
    time,
    distance,
    pace,
    calories,
    heartRate,
    routeProgressM,
    isPaused,
    isEffectivelyPaused,
    togglePause,
    getCollectedData,
    isDeviating,
    deviationSec,
    deviationAnchor,
    pauseAnchor,
    isWithinPauseAnchor,
    checkpoints,
    allCheckpointsVisited,
    visitedCount,
    nextCheckpointIdx,
    isStartupCountdown,
    startupCountdownSec,
  } = useNormalRunning({
    courseCoordinates: courseDetail.coordinates,
    onForceStop: useCallback(() => forceStopRef.current(), []),
    onDestinationReached: useCallback(() => autoCompleteRef.current(), []),
  });

  // 이탈 앵커 우선, 없으면 일시정지 앵커
  const courseAnchor = deviationAnchor ?? pauseAnchor;
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  const session = useNormalRunSessionStore((s) => s.session);
  const setResult = useNormalRunSessionStore((s) => s.setResult);
  const clearAll = useNormalRunSessionStore((s) => s.clearAll);

  const [isEnding, setIsEnding] = useState(false);

  useVoiceGuidance({
    sessionId: session?.runningSessionId ?? null,
    navigationBundleUrl: session?.navigationBundleUrl ?? null,
    routeProgressM,
    currentLatitude: gpsLocation?.latitude ?? null,
    currentLongitude: gpsLocation?.longitude ?? null,
    isDeviating,
    isPaused: isEffectivelyPaused,
    heartRate,
  });

  // "latest ref" 패턴: cleanup 클로저에서 최신값 접근
  const latestGetCollectedDataRef = useRef(getCollectedData);
  latestGetCollectedDataRef.current = getCollectedData;

  const latestGpsLocationRef = useRef(gpsLocation);
  latestGpsLocationRef.current = gpsLocation;

  // 비정상 종료 처리 (앱 이탈 시 세션 종료 API fire-and-forget)
  useEffect(() => {
    return () => {
      const {
        session: s,
        result: r,
        clearAll: ca,
      } = useNormalRunSessionStore.getState();
      if (!s || r) return; // 이미 완료됐거나 세션 없으면 skip
      const data = latestGetCollectedDataRef.current();
      const gps = latestGpsLocationRef.current;
      void stopWatchRunSync();
      completeRunningSession(s.runningSessionId, {
        completeState: 'FAIL',
        endLatitude: gps?.latitude ?? 0,
        endLongitude: gps?.longitude ?? 0,
        distanceGapM: 0,
        ...data,
      }).catch(() => {}); // fire-and-forget
      ca();
    };
  }, []);

  const handleStopRunning = useCallback(async () => {
    if (isEnding || !session) return;
    setIsEnding(true);
    void playVoiceCueOnBridge(pickRandomVoiceCue(['end_01', 'end_02']));
    void stopWatchRunSync();
    const data = getCollectedData();
    try {
      const res = await completeRunningSession(session.runningSessionId, {
        completeState: 'GIVEUP',
        endLatitude: gpsLocation?.latitude ?? 0,
        endLongitude: gpsLocation?.longitude ?? 0,
        distanceGapM: 0,
        ...data,
      });
      setResult(res.data);
    } catch {
      clearAll();
      navigate('/normal-run');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, session, getCollectedData, gpsLocation, setResult, clearAll, navigate]);

  const handleAutoComplete = useCallback(async () => {
    if (isEnding || !session) return;
    setIsEnding(true);
    void playVoiceCueOnBridge(pickRandomVoiceCue(['end_01', 'end_02']));
    void stopWatchRunSync();
    const data = getCollectedData();
    try {
      const res = await completeRunningSession(session.runningSessionId, {
        completeState: 'SUCCESS',
        endLatitude: gpsLocation?.latitude ?? 0,
        endLongitude: gpsLocation?.longitude ?? 0,
        distanceGapM: 0,
        ...data,
      });
      setResult(res.data);
    } catch {
      clearAll();
      navigate('/normal-run');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, session, getCollectedData, gpsLocation, setResult, clearAll, navigate]);

  // forceStopRef를 항상 최신 handleStopRunning으로 유지
  forceStopRef.current = handleStopRunning;
  autoCompleteRef.current = handleAutoComplete;

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-surface-inverse">
      <div className="shrink-0 border-b border-secondary-3 px-6 py-4">
        <div className="grid grid-cols-4 gap-2">
          <StatItem label="거리" value={distance} sub="km" />
          <StatItem label="페이스" value={pace} />
          <StatItem
            label="칼로리"
            value={String(calories)}
            valueClassName="text-primary-1"
            sub={<span className="text-primary-1">🔥</span>}
          />
          <StatItem label="심박수" value={String(heartRate)} sub="bpm" />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <NormalRunMap
          coordinates={courseDetail.coordinates}
          routeType={courseDetail.routeType}
          courseAnchor={courseAnchor}
          checkpoints={checkpoints}
          visitedCount={visitedCount}
          nextCheckpointIdx={nextCheckpointIdx}
        />

        {isStartupCountdown && (
          <div className="absolute inset-0 z-modal flex items-center justify-center bg-black/[0.35]">
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-surface-inverse/[0.9] shadow-soft-xl">
              <span className="font-bold tabular-nums text-8xl text-fg-inverse">
                {startupCountdownSec}
              </span>
            </div>
          </div>
        )}

        {checkpoints.length > 0 && !allCheckpointsVisited && (
          <div className="absolute top-3 left-0 right-0 z-sticky flex justify-center">
            <div className="rounded-full bg-surface-default/[0.88] px-4 py-1.5 text-fg-primary caption-b shadow-sm">
              체크포인트 {visitedCount} / {checkpoints.length}
            </div>
          </div>
        )}

        {isDeviating && !isPaused && (
          <div className="absolute top-14 left-0 right-0 z-sticky flex justify-center">
            <div className="rounded-full bg-error px-4 py-2 text-fg-inverse body-b">
              코스 이탈 중 · {deviationSec}s / 10s
            </div>
          </div>
        )}
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

          <div className="flex flex-col items-center gap-2">
            {isPaused && !isWithinPauseAnchor && (
              <span className="caption-r text-center text-secondary-5">
                안정권으로 복귀 후 재개 가능
              </span>
            )}
            <div className="relative flex w-full items-center justify-center">
              <button
                onClick={togglePause}
                disabled={isPaused && !isWithinPauseAnchor}
                className={cn(
                  'z-10 flex h-20 w-20 items-center justify-center rounded-full bg-primary-1 text-fg-inverse shadow-soft-lg',
                  isPaused &&
                    !isWithinPauseAnchor &&
                    'opacity-40 cursor-not-allowed'
                )}
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
                    : 'pointer-events-none translate-x-12.5 opacity-0'
                )}
                aria-label={isEnding ? '종료 중...' : '러닝 종료'}
              >
                <Square size={22} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
