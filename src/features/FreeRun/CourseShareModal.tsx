// 코스 등록 폼 Drawer (바텀 시트)
// shadcn Drawer (vaul) 사용 - 스와이프 제스처 및 스크롤 잠금 처리
// Drawer가 열릴 때 GET /meta/course/register로 코스 타입·난이도·모드 선택지를 조회해 렌더링

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/components/shadcn/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/shadcn/drawer';
import { cn, captureRouteAsBlob } from '@/shared/utils';
import type {
  CourseDifficulty,
  CourseType,
  CourseRegistrationMode,
  RouteType,
} from '@/apis';
import { registerCourse } from '@/apis/runningSessions';
import type { GpsSample } from '@/apis/runningSessions';
import { uploadCourseSnapshotApi } from '@/apis/course';
import { useCourseSurveys } from '@/hooks/FreeRun/useCourseSurveys';
import { toast } from 'sonner';

type CourseShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  runningSessionId: number | null;
  onRegistered: (courseId: number) => void;
  gpsSamples: GpsSample[];
};

export function CourseShareModal({
  isOpen,
  onClose,
  runningSessionId,
  onRegistered,
  gpsSamples,
}: CourseShareModalProps) {
  const queryClient = useQueryClient();
  const [courseTitle, setCourseTitle] = useState(
    `나의 러닝 ${new Date().toLocaleDateString()}`
  );
  // 사용자가 명시적으로 선택한 난이도 (null = 미선택, API 기본값 사용)
  const [difficultyOverride, setDifficultyOverride] =
    useState<CourseDifficulty | null>(null);
  // 선택된 코스 타입 목록 (서버 enum 값, 복수 선택 가능)
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [courseModeOverride, setCourseModeOverride] =
    useState<CourseRegistrationMode | null>(null);
  const [routeTypeOverride, setRouteTypeOverride] = useState<RouteType | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // isOpen이 true가 될 때 GET /meta/course/register API 호출
  // surveyData - API 응답 (courseTypes, difficulties, mode 배열)
  // 각 항목: { data: 서버 enum 값, label: 화면 표시 한국어 }
  const { surveyData, isLoading } = useCourseSurveys(isOpen);

  // 사용자가 선택한 값이 있으면 그 값, 없으면 API 첫 번째 항목을 기본값으로 사용
  const courseMode =
    courseModeOverride ??
    (surveyData?.mode[0]?.data as CourseRegistrationMode | undefined);
  const difficulty =
    difficultyOverride ??
    (surveyData?.difficulties[0]?.data as CourseDifficulty | undefined);
  const routeType =
    routeTypeOverride ??
    (surveyData?.routeTypes[0]?.data as RouteType | undefined);

  function toggleCourseType(data: CourseType) {
    setCourseTypes((prev) =>
      prev.includes(data) ? prev.filter((t) => t !== data) : [...prev, data]
    );
  }

  async function handleSubmit() {
    if (!courseMode || !difficulty || !routeType || !runningSessionId) return;
    setIsSubmitting(true);
    try {
      const res = await registerCourse(runningSessionId, {
        title: courseTitle,
        mode: courseMode,
        difficulty,
        courseTypes,
        routeType,
      });

      const courseId = res.data.courseId;

      // 경로 이미지 캡처 후 스냅샷 업로드 (실패해도 코스 등록은 유지)
      const blob = await captureRouteAsBlob(gpsSamples);
      if (blob) {
        try {
          await uploadCourseSnapshotApi(courseId, blob);
        } catch {
          // 스냅샷 업로드 실패는 무시
        }
      }

      // 자유러닝 코스 등록 후 관련 화면(일반/고스트/캘린더) 캐시 초기화
      queryClient.removeQueries({ queryKey: ['nearbyCourses'] });
      queryClient.removeQueries({ queryKey: ['nearbyGhostCourses'] });
      queryClient.removeQueries({ queryKey: ['runningHistory'] });

      onRegistered(courseId);
      toast.success('코스가 등록되었습니다!');
      onClose();
    } catch {
      toast.error('코스 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DrawerContent className="bg-secondary-2 border-t border-secondary-3 max-h-[90dvh]">
        <DrawerHeader className="text-left px-6 pt-4 pb-0">
          <DrawerTitle className="h3-b text-fg-inverse">
            코스 등록
          </DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-6 pb-8 pt-4 space-y-5">
          {/* 코스 제목 */}
          <div className="space-y-2">
            <label className="caption-b text-fg-inverse">
              코스 제목
            </label>
            <input
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-secondary-3 text-fg-inverse body-r border border-secondary-4 focus:outline-none focus:border-primary"
            />
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <span className="body-r text-secondary-5">
                로딩 중...
              </span>
            </div>
          )}

          {!isLoading && surveyData && (
            <>
              {/* 저장 유형 */}
              <div className="space-y-2">
                <label className="caption-b text-fg-inverse">
                  저장 유형
                </label>
                <div className="flex gap-2">
                  {surveyData.mode.map(({ data, label }) => (
                    <button
                      key={data}
                      onClick={() =>
                        setCourseModeOverride(data as CourseRegistrationMode)
                      }
                      className={cn(
                        'flex-1 py-2 rounded-xl caption-m transition-colors border',
                        courseMode === data
                          ? 'bg-primary text-fg-inverse border-transparent'
                          : 'bg-secondary-3 text-secondary-5 border-secondary-4'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 난이도 */}
              <div className="space-y-2">
                <label className="caption-b text-fg-inverse">
                  난이도
                </label>
                <div className="flex gap-2">
                  {surveyData.difficulties.map(({ data, label }) => (
                    <button
                      key={data}
                      onClick={() =>
                        setDifficultyOverride(data as CourseDifficulty)
                      }
                      className={cn(
                        'flex-1 py-2 rounded-xl caption-m transition-colors border',
                        difficulty === data
                          ? 'bg-primary text-fg-inverse border-transparent'
                          : 'bg-secondary-3 text-secondary-5 border-secondary-4'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 경로 유형 */}
              <div className="space-y-2">
                <label className="caption-b text-fg-inverse">
                  경로 유형
                </label>
                <div className="flex gap-2">
                  {surveyData.routeTypes.map(({ data, label }) => (
                    <button
                      key={data}
                      onClick={() => setRouteTypeOverride(data as RouteType)}
                      className={cn(
                        'flex-1 py-2 rounded-xl caption-m transition-colors border',
                        routeType === data
                          ? 'bg-primary text-fg-inverse border-transparent'
                          : 'bg-secondary-3 text-secondary-5 border-secondary-4'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 코스 타입 */}
              <div className="space-y-2">
                <label className="caption-b text-fg-inverse">
                  코스 타입{' '}
                  <span className="caption-r text-secondary-5">
                    (중복 가능)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {surveyData.courseTypes.map(({ data, label }) => (
                    <button
                      key={data}
                      onClick={() => toggleCourseType(data as CourseType)}
                      className={cn(
                        'px-3 py-2 rounded-xl caption-m transition-colors border',
                        courseTypes.includes(data as CourseType)
                          ? 'bg-primary text-fg-inverse border-transparent'
                          : 'bg-secondary-3 text-secondary-5 border-secondary-4'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 등록 버튼 */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-primary text-fg-inverse body-b h-auto"
          >
            {isSubmitting
              ? '등록 중...'
              : courseMode === 'PRIVATE'
                ? '개인 코스로 저장'
                : '커뮤니티에 등록'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
