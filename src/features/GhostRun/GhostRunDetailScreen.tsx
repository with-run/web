import { ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { GhostCourseDetail } from '@/apis';
import { createRunningSession } from '@/apis/runningSessions';
import { bridge } from '@/bridge';
import { BOTTOM_NAV_HEIGHT } from '@/shared/components';
import { WatchRunStatusNotice } from '@/shared/components';
import { Badge } from '@/shared/components/shadcn/badge';
import { Button } from '@/shared/components/shadcn/button';
import { useRunDetailMap } from '@/shared/hooks/useRunDetailMap';
import { useRunBottomSheet } from '@/shared/hooks/useRunBottomSheet';
import { useRunLocation } from '@/shared/hooks/useRunLocation';
import { formatTime } from '@/shared/utils';
import { useGhostRunSessionStore } from '@/stores/GhostRun';
import { useGhostRunLeaderboard } from '@/hooks/GhostRun/useGhostRunLeaderboard';
import { startWatchRunSync } from '@/shared/utils/watchRunBridge';

type GhostTarget = { runningSessionId: number; isMine: boolean };

type GhostRunDetailScreenProps = {
  course: GhostCourseDetail;
};

export function GhostRunDetailScreen({ course }: GhostRunDetailScreenProps) {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<GhostTarget | null>(
    null
  );

  const { location: gpsLocation } = useRunLocation();
  const setSession = useGhostRunSessionStore((s) => s.setSession);
  const {
    sheetRef,
    headerRef,
    sheetHeight,
    headerHeight,
    sheetOffsetY,
    isDragging,
    dragControls,
    collapse,
    startDrag,
    handleDragStart,
    handleDragEnd,
    handleContentTouchStart,
    handleContentTouchMove,
    handleContentTouchEnd,
  } = useRunBottomSheet({
    initialSnap: 'middle',
    bottomInset: BOTTOM_NAV_HEIGHT,
  });

  const { isNearStart } = useRunDetailMap(containerRef, {
    coordinates: course.coordinates,
    routeType: course.routeType,
    startLatitude: course.startLatitude,
    startLongitude: course.startLongitude,
    endLatitude: course.endLatitude,
    endLongitude: course.endLongitude,
  }, {
    onMapTouched: collapse,
  });

  const {
    items,
    hasMore,
    isLoading: leaderboardLoading,
    loadMore,
  } = useGhostRunLeaderboard(course.courseId);

  // IntersectionObserver로 무한스크롤 센티널 연결
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !leaderboardLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, leaderboardLoading, loadMore]);

  const handleStartRunning = useCallback(async () => {
    if (!gpsLocation || !courseId) return;

    setIsStarting(true);
    try {
      const res = await createRunningSession({
        mode: 'GHOST',
        courseId: Number(courseId),
        ghostTargetRunningSessionId: selectedTarget?.runningSessionId,
        startLatitude: gpsLocation.latitude,
        startLongitude: gpsLocation.longitude,
      });
      await startWatchRunSync({
        runningSessionId: res.data.runningSessionId,
        mode: 'GHOST',
        courseCoordinates: course.coordinates.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        })),
        ghostCoordinates:
          res.data.ghostTargetGpsSamples?.map((sample) => ({
            latitude: sample.latitude,
            longitude: sample.longitude,
          })) ?? [],
      });
      setSession(res.data);
      navigate(`/ghost-run-session/${courseId}`);
    } finally {
      setIsStarting(false);
    }
  }, [gpsLocation, courseId, selectedTarget, setSession, navigate]);

  const handleSelectMyRecord = () => {
    if (!course.myRecord) return;
    setSelectedTarget((prev) =>
      prev?.runningSessionId === course.myRecord!.runningSessionId
        ? null
        : { runningSessionId: course.myRecord!.runningSessionId, isMine: true }
    );
  };

  const handleSelectLeaderboard = (runningSessionId: number) => {
    setSelectedTarget((prev) =>
      prev?.runningSessionId === runningSessionId
        ? null
        : { runningSessionId, isMine: false }
    );
  };

  const hasAnyGhostCandidate = !!course.myRecord || items.length > 0;
  const requiresGhostSelection = hasAnyGhostCandidate && !selectedTarget;
  const isNearStartRequired = !isNearStart;
  const isDisabled =
    isNearStartRequired ||
    !gpsLocation ||
    requiresGhostSelection ||
    isStarting;
  const ghostStartButtonLabel = isStarting
    ? '시작 중...'
    : isNearStartRequired
      ? '출발 지점에 서주세요!'
    : requiresGhostSelection
      ? '고스트를 선택해주세요!'
      : !hasAnyGhostCandidate
        ? '첫 기록 만들기'
      : !gpsLocation
        ? '위치 정보를 확인중입니다...'
        : '대결 시작';

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* 지도 */}
      <div ref={containerRef} className="h-full w-full" />

      {/* 상단 뒤로가기 버튼 */}
      <div className="absolute left-4 top-4 z-raised">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-12 w-12 rounded-full border-border-default bg-surface-default text-fg-primary"
        >
          <ArrowLeft size={20} />
        </Button>
      </div>

      {/* 하단 코스 정보 패널 */}
      <motion.div
        ref={sheetRef}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{
          top: 0,
          bottom: sheetHeight - headerHeight - BOTTOM_NAV_HEIGHT,
        }}
        dragElastic={0}
        dragMomentum={false}
        animate={{ y: sheetOffsetY }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="absolute bottom-0 left-0 right-0 z-raised flex h-dvh flex-col overflow-hidden rounded-t-2xl bg-surface-default shadow-lg"
      >
        <div
          className="flex h-full flex-col"
          style={{ height: `calc(100dvh - ${sheetOffsetY}px)` }}
        >
          <div
            ref={headerRef}
            className="shrink-0 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={startDrag}
          >
            <div className="flex justify-center py-4">
              <div className="h-1 w-10 rounded-full bg-border-default" />
            </div>
            <div className="px-5 pb-4">
              <h2 className="h2-b text-fg-primary">{course.title}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full border-border-default bg-transparent px-3 py-1"
                >
                  {(course.distanceM / 1000).toFixed(1)}km
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full border-border-default bg-transparent px-3 py-1"
                >
                  고도 {course.elevationGainM}m
                </Badge>
                {course.difficulty != null && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-border-default bg-transparent px-3 py-1"
                  >
                    {course.difficulty.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className={`h-full overflow-y-auto overscroll-contain px-5 ${
                isDragging ? 'pointer-events-none' : ''
              }`}
              onTouchStart={handleContentTouchStart}
              onTouchMove={handleContentTouchMove}
              onTouchEnd={handleContentTouchEnd}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div className="flex flex-col gap-4 pb-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-primary-1" />
                    <span className="body-l-b text-fg-primary">
                      리더보드
                    </span>
                  </div>

                  {!selectedTarget && hasAnyGhostCandidate && (
                    <p className="caption-r text-fg-secondary">
                      대결할 상대를 선택하세요
                    </p>
                  )}

                  {!hasAnyGhostCandidate && (
                    <p className="caption-r text-fg-secondary">
                      아직 기록이 없어 이번 러닝을 기준 기록으로 시작합니다.
                    </p>
                  )}

                  {course.myRecord && (
                    <button
                      onClick={handleSelectMyRecord}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                        selectedTarget?.runningSessionId ===
                        course.myRecord.runningSessionId
                          ? 'border-primary-1 bg-primary-1/[0.08]'
                          : 'border-border-default bg-surface-subtle'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="caption-r text-primary-1">
                          나의 최고 기록
                        </span>
                        <span className="body-l-b text-fg-primary">
                          {formatTime(course.myRecord.durationSec)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="caption-r text-fg-secondary">
                          {course.myRecord.rank}위
                        </span>
                        <span className="body-m text-primary-1">
                          {course.myRecord.point.toLocaleString()}P
                        </span>
                      </div>
                    </button>
                  )}

                  <div className="flex flex-col gap-1">
                    {items.map((item) => (
                      <button
                        key={item.leaderboardId}
                        onClick={() => handleSelectLeaderboard(item.runningSessionId)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                          selectedTarget?.runningSessionId === item.runningSessionId
                            ? 'border-primary-1 bg-primary-1/[0.08]'
                            : 'border-border-default bg-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="caption-r w-5 text-center text-fg-secondary">
                            {item.rank}
                          </span>
                          <span className="body-m text-fg-primary">
                            {item.nickname}
                          </span>
                        </div>
                        <span className="caption-r text-primary-1">
                          {item.point.toLocaleString()}P
                        </span>
                      </button>
                    ))}

                    <div ref={sentinelRef} className="h-1" />

                    {leaderboardLoading && (
                      <p className="caption-r py-2 text-center text-fg-secondary">
                        불러오는 중...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="shrink-0 border-t border-border-default px-5 pt-4"
            style={{ paddingBottom: BOTTOM_NAV_HEIGHT + 20 }}
          >
            <WatchRunStatusNotice className="mb-3" />
            {bridge.isWebViewBridgeAvailable ? (
              <Button
                type="button"
                disabled={isDisabled}
                onClick={handleStartRunning}
                className="h-14 w-full rounded-xl body-l-b"
              >
                {ghostStartButtonLabel}
              </Button>
            ) : (
              <p className="body-m py-3 text-center text-fg-secondary">
                모바일 앱에서 이용할 수 있는 서비스입니다.
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
