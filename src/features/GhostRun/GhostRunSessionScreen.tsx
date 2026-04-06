import { Flag } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { GhostCourseDetail } from '@/apis';
import { completeRunningSession } from '@/apis/runningSessions';
import { useBridgeDataStore } from '@/bridge';
import { useNormalRunning } from '@/hooks/NormalRun/useNormalRunning';
import { useVoiceGuidance } from '@/shared/hooks/Running/useVoiceGuidance';
import { GhostRunMap } from '@/features/GhostRun/GhostRunMap';
import { cn } from '@/shared/utils';
import { useGhostRunSessionStore } from '@/stores/GhostRun';
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

type GhostRunSessionScreenProps = {
  courseDetail: GhostCourseDetail;
};

export function GhostRunSessionScreen({
  courseDetail,
}: GhostRunSessionScreenProps) {
  const navigate = useNavigate();

  // 포기 모달 상태
  const [isGiveupModalOpen, setIsGiveupModalOpen] = useState(false);
  const [giveupCountdown, setGiveupCountdown] = useState(5);
  const [isEnding, setIsEnding] = useState(false);
  const [ghostFinished, setGhostFinished] = useState(false);

  const forceStopRef = useRef<() => void>(() => {});
  const autoCompleteRef = useRef<() => void>(() => {});

  const {
    time,
    distance,
    pace,
    calories,
    heartRate,
    isEffectivelyPaused,
    routeProgressM,
    totalRouteDistanceM,
    getCollectedData,
    isDeviating,
    deviationSec,
    deviationAnchor,
    checkpoints,
    visitedCount,
    nextCheckpointIdx,
    isStartupCountdown,
    startupCountdownSec,
  } = useNormalRunning({
    courseCoordinates: courseDetail.coordinates,
    onForceStop: useCallback(() => forceStopRef.current(), []),
    onDestinationReached: useCallback(() => autoCompleteRef.current(), []),
  });

  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);
  const session = useGhostRunSessionStore((s) => s.session);

  const gpsSamples = session?.ghostTargetGpsSamples ?? null;
  const ghostDurationSec =
    gpsSamples && gpsSamples.length >= 2
      ? (new Date(gpsSamples.at(-1)!.sampledAt).getTime() -
          new Date(gpsSamples[0].sampledAt).getTime()) /
        1000
      : 0;

  const setResult = useGhostRunSessionStore((s) => s.setResult);
  const clearAll = useGhostRunSessionStore((s) => s.clearAll);

  const ghostDistanceMRef = useRef(0);
  const userRouteDistMRef = useRef(0);
  const ghostLoseGapMRef = useRef(0);
  const ghostFinishedAtSecRef = useRef<number | null>(null);

  const latestGetCollectedDataRef = useRef(getCollectedData);
  latestGetCollectedDataRef.current = getCollectedData;
  const latestGpsLocationRef = useRef(gpsLocation);
  latestGpsLocationRef.current = gpsLocation;

  useEffect(() => {
    userRouteDistMRef.current = routeProgressM;
  }, [routeProgressM]);

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

  // 비정상 종료 처리
  useEffect(() => {
    return () => {
      const {
        session: s,
        result: r,
        clearAll: ca,
      } = useGhostRunSessionStore.getState();
      if (!s || r) return;
      const data = latestGetCollectedDataRef.current();
      const gps = latestGpsLocationRef.current;
      void stopWatchRunSync();
      completeRunningSession(s.runningSessionId, {
        completeState: 'FAIL',
        endLatitude: gps?.latitude ?? 0,
        endLongitude: gps?.longitude ?? 0,
        distanceGapM: 0,
        ...data,
      }).catch(() => {});
      ca();
    };
  }, []);

  // 고스트 완주 콜백
  const handleGhostFinished = useCallback(() => {
    ghostFinishedAtSecRef.current = Math.floor(Date.now() / 1000);
    // 고스트 완주 시점 사용자 진행 거리 기반으로 gap 계산 (음수: 사용자가 아직 덜 달림)
    ghostLoseGapMRef.current = Math.round(
      userRouteDistMRef.current - totalRouteDistanceM
    );
    setGhostFinished(true);
  }, [totalRouteDistanceM]);

  // 목적지 자동완주 콜백
  const handleAutoComplete = useCallback(async () => {
    if (isEnding || !session) return;
    setIsEnding(true);
    void playVoiceCueOnBridge(pickRandomVoiceCue(['end_01', 'end_02']));
    void stopWatchRunSync();

    const data = getCollectedData();
    const userFinishedAtSec = Math.floor(Date.now() / 1000);
    const ghostAtSec = ghostFinishedAtSecRef.current;

    let distanceGapM: number;
    if (ghostAtSec === null) {
      // 사용자가 먼저 완주 → 양수
      distanceGapM = Math.round(totalRouteDistanceM - ghostDistanceMRef.current);
    } else if (ghostAtSec === userFinishedAtSec) {
      // 무승부
      distanceGapM = 0;
    } else {
      // 고스트가 먼저 완주 → 음수 (고스트 완주 시점에 저장해둔 값)
      distanceGapM = ghostLoseGapMRef.current;
    }

    try {
      const res = await completeRunningSession(session.runningSessionId, {
        completeState: 'SUCCESS',
        endLatitude: gpsLocation?.latitude ?? 0,
        endLongitude: gpsLocation?.longitude ?? 0,
        distanceGapM,
        ...data,
      });
      setResult(res.data);
    } catch {
      clearAll();
      navigate('/ghost-run');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, session, getCollectedData, gpsLocation, totalRouteDistanceM, setResult, clearAll, navigate]);

  // 코스 이탈 강제 종료 처리 (FAIL)
  const handleForceFail = useCallback(async () => {
    if (isEnding || !session) return;
    setIsEnding(true);
    void playVoiceCueOnBridge(pickRandomVoiceCue(['end_01', 'end_02']));
    void stopWatchRunSync();

    const data = getCollectedData();
    try {
      const res = await completeRunningSession(session.runningSessionId, {
        completeState: 'FAIL',
        endLatitude: gpsLocation?.latitude ?? 0,
        endLongitude: gpsLocation?.longitude ?? 0,
        distanceGapM: 0,
        ...data,
      });
      setResult(res.data);
    } catch {
      clearAll();
      navigate('/ghost-run');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, session, getCollectedData, gpsLocation, setResult, clearAll, navigate]);

  // 포기 처리
  const handleGiveup = useCallback(async () => {
    if (isEnding || !session) return;
    setIsEnding(true);
    setIsGiveupModalOpen(false);
    void playVoiceCueOnBridge(pickRandomVoiceCue(['end_01', 'end_02']));
    void stopWatchRunSync();

    const data = getCollectedData();
    const distanceGapM = Math.round(userRouteDistMRef.current - totalRouteDistanceM); // 음수

    try {
      const res = await completeRunningSession(session.runningSessionId, {
        completeState: 'GIVEUP',
        endLatitude: gpsLocation?.latitude ?? 0,
        endLongitude: gpsLocation?.longitude ?? 0,
        distanceGapM,
        ...data,
      });
      setResult(res.data);
    } catch {
      clearAll();
      navigate('/ghost-run');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, session, getCollectedData, gpsLocation, totalRouteDistanceM, setResult, clearAll, navigate]);

  forceStopRef.current = handleForceFail;
  autoCompleteRef.current = handleAutoComplete;

  // 포기 모달 5초 카운트다운
  useEffect(() => {
    if (!isGiveupModalOpen) {
      setGiveupCountdown(5);
      return;
    }
    const id = setInterval(() => {
      setGiveupCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setIsGiveupModalOpen(false);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isGiveupModalOpen]);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-surface-inverse">
      <div className="shrink-0 border-b border-secondary-3 px-6 py-4">
        <div className="grid grid-cols-4 gap-2">
          <StatItem label="거리" value={distance} sub="km" />
          <StatItem label="페이스" value={pace} />
          <StatItem
            label="칼로리"
            value={String(calories)}
            valueClassName="text-primary"
            sub={<span className="text-primary">🔥</span>}
          />
          <StatItem label="심박수" value={String(heartRate)} sub="bpm" />
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <GhostRunMap
          coordinates={courseDetail.coordinates}
          routeType={courseDetail.routeType}
          courseAnchor={deviationAnchor}
          ghostDurationSec={ghostDurationSec}
          isPaused={isEffectivelyPaused}
          ghostDistanceMRef={ghostDistanceMRef}
          onGhostFinished={handleGhostFinished}
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

        {ghostFinished && (
          <div className="absolute top-3 left-0 right-0 z-sticky flex justify-center">
            <div className="rounded-full bg-error px-4 py-2 text-fg-inverse body-b">
              고스트가 먼저 도착했습니다! 계속 달리세요
            </div>
          </div>
        )}

        {isDeviating && !ghostFinished && (
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

          <button
            onClick={() => setIsGiveupModalOpen(true)}
            disabled={isEnding}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-3 text-fg-inverse shadow-soft-lg"
            aria-label="포기"
          >
            <Flag size={30} />
          </button>
        </div>
      </div>

      {/* 포기 확인 모달 */}
      {isGiveupModalOpen && (
        <div className="absolute inset-0 z-modal flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm rounded-3xl bg-surface-default p-8 flex flex-col items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error/[0.12]">
              <Flag size={32} className="text-error" />
            </div>

            <div className="flex flex-col items-center gap-1 text-center">
              <span className="h3-b text-fg-primary">정말 포기하시겠어요?</span>
              <span className="body-r text-fg-secondary">
                포기 시 패배 처리됩니다
              </span>
            </div>

            {/* 5초 카운트다운 */}
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border-default">
              <span className="h2-b tabular-nums text-fg-secondary">
                {giveupCountdown}
              </span>
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={() => setIsGiveupModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-border-default body-b text-fg-primary"
              >
                계속 달리기
              </button>
              <button
                onClick={handleGiveup}
                disabled={isEnding}
                className="flex-1 py-3 rounded-2xl bg-error body-b text-fg-inverse"
              >
                {isEnding ? '처리 중...' : '포기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
