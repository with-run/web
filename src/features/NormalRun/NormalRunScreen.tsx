import { Filter, Home, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  getRecommendedCoursesApi,
  type CourseItem,
  type PreferredDistanceM,
} from '@/apis';
import {
  BOTTOM_NAV_HEIGHT,
  CoursePageNav,
  RunningCourseCard,
  RunningCourseFilterDrawer,
  RunningCourseSearchBar,
} from '@/shared/components';
import { Button } from '@/shared/components/shadcn/button';
import { useRunCircleMap } from '@/shared/hooks/useRunCircleMap';
import { useNormalRunMapCourses } from '@/hooks/NormalRun/useNormalRunMapCourses';
import { useRunMapFilter } from '@/shared/hooks/useRunMapFilter';
import { useRunBottomSheet } from '@/shared/hooks/useRunBottomSheet';
import { RunCircleRadialMenu } from '@/shared/components';
import { useNormalRunFilterStore } from '@/stores/NormalRun/useNormalRunFilterStore';
import { useBridgeDataStore } from '@/bridge';

export function NormalRunScreen() {
  const navigate = useNavigate();
  const [mapCourses, setMapCourses] = useState<CourseItem[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<CourseItem[]>(
    []
  );
  const [isRecommendModalOpen, setIsRecommendModalOpen] = useState(false);
  const [recenterToUserRequestKey, setRecenterToUserRequestKey] = useState(0);

  const {
    searchKeyword,
    setSearchKeyword,
    circleMode,
    setCircleMode,
    courseTab,
    setCourseTab,
    sheetSnap: persistedSheetSnap,
    setSheetSnap,
  } = useNormalRunFilterStore();

  const {
    showFilterDrawer,
    setShowFilterDrawer,
    filters,
    appliedFilters,
    filterRequestNonce,
    preferredDistanceMs,
    categories,
    handleFilterChange,
    handleDistanceRangeChange,
    handleSortByChange,
    handleResetFilters,
    applyFilters,
  } = useRunMapFilter(useNormalRunFilterStore);

  const {
    sheetRef,
    headerRef,
    sheetHeight,
    headerHeight,
    sheetOffsetY,
    isDragging,
    dragControls,
    collapse,
    expand,
    startDrag,
    handleDragStart,
    handleDragEnd,
  } = useRunBottomSheet({
    bottomInset: BOTTOM_NAV_HEIGHT,
    initialSnap: persistedSheetSnap,
    onSnapChange: setSheetSnap,
  });

  const sortBy = useMemo<'DISTANCE' | 'POPULAR'>(
    () => (appliedFilters.sortBy === 'POPULAR' ? 'POPULAR' : 'DISTANCE'),
    [appliedFilters.sortBy]
  );

  const { containerRef, center, radiusM } = useRunCircleMap(
    mapCourses,
    circleMode,
    collapse,
    '--primary-1',
    recenterToUserRequestKey
  );

  const { courses, isLoading, currentPage, totalPages, goToPage } =
    useNormalRunMapCourses(
      center,
      radiusM,
      preferredDistanceMs,
      sortBy,
      filterRequestNonce
    );

  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  // Refs for stable access in async callbacks
  const centerRef = useRef(center);
  centerRef.current = center;
  const radiusMRef = useRef(radiusM);
  radiusMRef.current = radiusM;
  const preferredDistanceMsRef = useRef(preferredDistanceMs);
  preferredDistanceMsRef.current = preferredDistanceMs;
  const gpsLocationRef = useRef(gpsLocation);
  gpsLocationRef.current = gpsLocation;

  const fetchRecommended = useCallback(
    async (preferredDmOverride?: PreferredDistanceM[]) => {
      const c = centerRef.current;
      if (!c) return;
      const gps = gpsLocationRef.current;
      const dms = preferredDmOverride ?? preferredDistanceMsRef.current;
      try {
        const res = await getRecommendedCoursesApi({
          latitude: gps?.latitude ?? c.latitude,
          longitude: gps?.longitude ?? c.longitude,
          targetLatitude: c.latitude,
          targetLongitude: c.longitude,
          radiusM: Math.max(1000, Math.min(5000, radiusMRef.current)),
          preferredDistanceMs: dms,
        });
        setRecommendedCourses(res.data.items);
      } catch {
        /* ignore */
      }
    },
    []
  );

  // 중심 좌표가 변경될 때마다 추천 코스 재조회
  useEffect(() => {
    if (center) {
      fetchRecommended();
    }
  }, [center, fetchRecommended]);

  // 필터 초기화 시 추천 코스도 함께 갱신
  const handleResetFiltersAndRecommend = useCallback(() => {
    handleResetFilters();
    fetchRecommended([{ min: 1, max: 5000 }]);
  }, [handleResetFilters, fetchRecommended]);

  useEffect(() => {
    setMapCourses(courses);
  }, [courses]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    const keyword = searchKeyword.trim();
    if (keyword) chips.push(`검색: ${keyword}`);
    if (courseTab === 'community') chips.push('커뮤니티 코스');

    const distanceChanged =
      appliedFilters.distanceRange.min !== 0 ||
      appliedFilters.distanceRange.max !== 5000;
    if (distanceChanged) {
      chips.push(
        `${(appliedFilters.distanceRange.min / 1000).toFixed(1)}~${(
          appliedFilters.distanceRange.max / 1000
        ).toFixed(1)}km`
      );
    }

    if (sortBy === 'POPULAR') chips.push('인기순');

    const categoryLabelMap = new Map<string, string>();
    categories.forEach((category) => {
      category.options.forEach((option) => {
        categoryLabelMap.set(option.value, option.label);
      });
    });

    appliedFilters.courseType.forEach((value) => {
      chips.push(categoryLabelMap.get(value) ?? value);
    });
    appliedFilters.difficulty.forEach((value) => {
      chips.push(categoryLabelMap.get(value) ?? value);
    });

    return chips;
  }, [searchKeyword, courseTab, appliedFilters, sortBy, categories]);

  useEffect(() => {
    if (!isLoading && courses.length > 0) {
      expand();
    }
  }, [isLoading, courses.length, expand]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* 카카오맵 컨테이너 */}
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ touchAction: 'none' }}
      />

      {/* 플로팅 검색바 (좌상단) */}
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2"
        style={{ right: '104px' }}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => navigate('/home')}
          className="h-10 w-10 shrink-0 rounded-full border-border-default bg-surface-default text-fg-primary shadow-md"
        >
          <Home size={18} />
        </Button>
        <RunningCourseSearchBar
          searchKeyword={searchKeyword}
          handleSearchKeyword={setSearchKeyword}
          compact
        />
      </div>

      {/* 필터 버튼 */}
      <div className="absolute right-4 top-4 z-20">
        <button
          onClick={() => setShowFilterDrawer(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border-default bg-surface-default text-fg-primary shadow-md"
        >
          <Filter size={18} />
        </button>
      </div>

      {/* Radial Menu */}
      <RunCircleRadialMenu
        circleMode={circleMode}
        onCircleModeChange={setCircleMode}
        onUserLocationSelect={() =>
          setRecenterToUserRequestKey((prev) => prev + 1)
        }
      />

      {/* 드래그 가능한 바텀시트 */}
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
        animate={{
          y: sheetOffsetY,
        }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className="absolute bottom-0 left-0 right-0 z-10 flex max-h-[60dvh] flex-col rounded-t-2xl bg-surface-default shadow-soft-xl"
      >
        {/* 시트 헤더 (드래그 타겟 + 탭 버튼) */}
        <div
          ref={headerRef}
          className="cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          onPointerDown={startDrag}
        >
          {/* 드래그 바 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-border-default" />
          </div>

          {/* 탭 버튼 + 코스 추천 버튼 */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCourseTab('official');
                  expand();
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  courseTab === 'official'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border-default text-fg-secondary'
                }`}
              >
                공식코스
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCourseTab('community');
                  expand();
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  courseTab === 'community'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border-default text-fg-secondary'
                }`}
              >
                커뮤니티 코스
              </button>
            </div>

            {/* 코스 추천 버튼 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRecommendModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
            >
              <Sparkles size={14} />
              코스 추천
            </button>
          </div>
        </div>

        {/* 스크롤 가능한 코스 리스트 */}
        <div
          className={`flex-1 overflow-y-auto px-5 py-4 ${
            isDragging ? 'pointer-events-none' : ''
          }`}
          style={{ touchAction: 'pan-y', paddingBottom: 16 }}
        >
          {activeFilterChips.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-border-default bg-surface-muted px-3 py-1 text-xs text-fg-secondary"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          {isLoading && courses.length === 0 ? (
            <div className="flex h-24 items-center justify-center">
              <p className="body-r text-fg-secondary">
                코스를 불러오는 중입니다...
              </p>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border-default px-5 py-4 text-center">
              <p className="body-l-b text-fg-primary">
                검색 결과가 없습니다
              </p>
              <p className="body-r text-fg-secondary">
                지도에서 탐색 범위를 넓혀보세요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {courses.map((course) => (
                <RunningCourseCard
                  key={course.courseId}
                  course={course}
                  isSaved={false}
                  onClick={() => navigate(`/normal-run/${course.courseId}`)}
                  onToggleSave={() => {}}
                />
              ))}
            </div>
          )}
        </div>

        {/* 페이지 네비게이션 / 로딩 스켈레톤 */}
        {(isLoading || totalPages > 0) && (
          <div
            className="shrink-0 py-2"
            style={{ paddingBottom: BOTTOM_NAV_HEIGHT + 8 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-subtle" />
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-subtle" />
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-subtle" />
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-subtle" />
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-subtle" />
              </div>
            ) : (
              <CoursePageNav
                currentPage={currentPage + 1}
                totalPages={totalPages}
                onPageChange={(p: number) => goToPage(p - 1)}
              />
            )}
          </div>
        )}
      </motion.div>

      <RunningCourseFilterDrawer
        isOpen={showFilterDrawer}
        categories={categories}
        values={filters}
        sortOptions={[
          { value: 'DISTANCE', label: '가까운 순' },
          { value: 'POPULAR', label: '인기순' },
        ]}
        onClose={() => setShowFilterDrawer(false)}
        onApply={applyFilters}
        onReset={handleResetFiltersAndRecommend}
        onChange={handleFilterChange}
        onSortByChange={handleSortByChange}
        onDistanceRangeChange={handleDistanceRangeChange}
      />

      {/* 추천 코스 모달 */}
      <AnimatePresence>
        {isRecommendModalOpen && (
          <motion.div
            className="fixed inset-0 z-toast flex items-center justify-center bg-black/50 px-5"
            onClick={() => setIsRecommendModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="flex w-full max-w-sm max-h-[70dvh] flex-col rounded-3xl bg-surface-default shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* 헤더 */}
              <div className="shrink-0 px-5 pb-3 pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles size={16} className="text-primary" />
                    </div>
                    <span className="body-l-b text-fg-primary">
                      러너님이 좋아하실만한 코스에요!
                    </span>
                  </div>
                  <button
                    onClick={() => setIsRecommendModalOpen(false)}
                    className="shrink-0 text-fg-secondary"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 구분선 */}
              <div className="mx-5 h-px bg-border-default" />

              {/* 스크롤 가능한 코스 리스트 */}
              <div className="flex-1 overflow-y-auto px-5 pt-4 pb-4">
                {recommendedCourses.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <p className="body-l-b text-fg-primary">
                      추천 코스가 없습니다
                    </p>
                    <p className="body-r text-fg-secondary">
                      탐색 범위를 조정하거나 필터를 변경해보세요.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {recommendedCourses.map((course, idx) => (
                      <div key={course.courseId} className="relative">
                        {idx < 3 && (
                          <div
                            className="absolute -left-1 -top-1 z-100 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-md"
                            style={{
                              background: ['#FFD700', '#D0D0D0', '#CD8B4A'][
                                idx
                              ],
                              color: ['#7B5800', '#3A3A3A', '#5C2E00'][idx],
                            }}
                          >
                            {idx + 1}
                          </div>
                        )}
                        <RunningCourseCard
                          course={course}
                          isSaved={false}
                          onClick={() => {
                            setIsRecommendModalOpen(false);
                            navigate(`/normal-run/${course.courseId}`);
                          }}
                          onToggleSave={() => {}}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단 고정 여백 — 둥근 모서리 가시 영역 확보 */}
              <div className="shrink-0 h-5" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
