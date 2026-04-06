import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { WatchRunStatusNotice } from '@/shared/components';
import { Badge } from '@/shared/components/shadcn/badge';
import { Button } from '@/shared/components/shadcn/button';
import { useRunDetailMap } from '@/shared/hooks/useRunDetailMap';
import type { CourseDetail } from '@/apis/course';
import type { CourseDifficulty, CourseType } from '@/apis';
import { createRunningSession } from '@/apis/runningSessions';
import { useNormalRunSessionStore } from '@/stores/NormalRun';
import { bridge, useBridgeDataStore } from '@/bridge';
import { BOTTOM_NAV_HEIGHT } from '@/shared/components';
import { useRunBottomSheet } from '@/shared/hooks/useRunBottomSheet';
import { startWatchRunSync } from '@/shared/utils/watchRunBridge';

const DIFFICULTY_LABEL: Record<CourseDifficulty, string> = {
  EASY: '쉬움',
  MEDIUM: '보통',
  HARD: '어려움',
};

const COURSE_TYPE_LABEL: Record<CourseType, string> = {
  URBAN: '도심',
  PARK: '공원',
  RIVERSIDE: '한강변',
  MOUNTAIN_TRAIL: '산/둘레길',
  TRACK: '트랙',
  OTHER: '기타',
};

type NormalRunDetailScreenProps = {
  course: CourseDetail;
};

export function NormalRunDetailScreen({ course }: NormalRunDetailScreenProps) {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarting, setIsStarting] = useState(false);

  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);
  const setSession = useNormalRunSessionStore((s) => s.setSession);
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

  const { isNearStart } = useRunDetailMap(
    containerRef,
    {
      coordinates: course.coordinates,
      routeType: course.routeType,
      startLatitude: course.startLatitude,
      startLongitude: course.startLongitude,
      endLatitude: course.endLatitude,
      endLongitude: course.endLongitude,
    },
    {
      onMapTouched: collapse,
    }
  );

  const handleStartRunning = async () => {
    if (!gpsLocation || !courseId) return;

    setIsStarting(true);
    try {
      const res = await createRunningSession({
        mode: 'COURSE',
        courseId: Number(courseId),
        startLatitude: gpsLocation.latitude,
        startLongitude: gpsLocation.longitude,
      });
      await startWatchRunSync({
        runningSessionId: res.data.runningSessionId,
        mode: 'COURSE',
        courseCoordinates: course.coordinates.map((point) => ({
          latitude: point.latitude,
          longitude: point.longitude,
        })),
      });
      setSession(res.data);
      navigate(`/normal-run-session/${courseId}`);
    } finally {
      setIsStarting(false);
    }
  };

  const canStart = isNearStart && !!gpsLocation && !isStarting;
  const normalStartButtonLabel = isStarting
    ? '시작 중...'
    : !gpsLocation
      ? '위치 정보를 확인중입니다...'
      : isNearStart
        ? '러닝 시작'
        : '출발 지점에 서주세요!';

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
              <h2 className="h2-b text-fg-primary">
                {course.title}
              </h2>
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
                    {DIFFICULTY_LABEL[course.difficulty.data]}
                  </Badge>
                )}
                {course.courseTypes.map((type) => (
                  <Badge
                    key={type.data}
                    variant="outline"
                    className="rounded-full border-primary-1/[0.25] bg-primary-1/[0.1] px-3 py-1 text-primary-1"
                  >
                    {COURSE_TYPE_LABEL[type.data]}
                  </Badge>
                ))}
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
              <div className="flex min-h-full flex-col pb-4" />
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
                disabled={!canStart}
                onClick={handleStartRunning}
                className="h-14 w-full rounded-xl body-l-b"
              >
                {normalStartButtonLabel}
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
