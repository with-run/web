import { Filter, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { CourseItem } from '@/apis';
import {
  BOTTOM_NAV_HEIGHT,
  CoursePageNav,
  RunCircleRadialMenu,
  RunningCourseCard,
  RunningCourseFilterDrawer,
  RunningCourseSearchBar,
} from '@/shared/components';
import { Button } from '@/shared/components/shadcn/button';
import { useRunCircleMap } from '@/shared/hooks/useRunCircleMap';
import { useRunMapFilter } from '@/shared/hooks/useRunMapFilter';
import { useRunBottomSheet } from '@/shared/hooks/useRunBottomSheet';
import { useGhostRunMapCourses } from '@/hooks/GhostRun/useGhostRunMapCourses';
import { useGhostRunFilterStore } from '@/stores/GhostRun/useGhostRunFilterStore';

export function GhostRunScreen() {
  const navigate = useNavigate();
  const [mapCourses, setMapCourses] = useState<CourseItem[]>([]);
  const [recenterToUserRequestKey, setRecenterToUserRequestKey] = useState(0);

  const {
    searchKeyword,
    setSearchKeyword,
    circleMode,
    setCircleMode,
    sheetSnap: persistedSheetSnap,
    setSheetSnap,
  } = useGhostRunFilterStore();

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
  } = useRunMapFilter(useGhostRunFilterStore);

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

  const sortBy = useMemo<'DISTANCE' | 'GHOST_RUN_COUNT'>(
    () =>
      appliedFilters.sortBy === 'GHOST_RUN_COUNT'
        ? 'GHOST_RUN_COUNT'
        : 'DISTANCE',
    [appliedFilters.sortBy]
  );

  const { containerRef, center, radiusM } = useRunCircleMap(
    mapCourses,
    circleMode,
    collapse,
    '--info',
    recenterToUserRequestKey
  );

  const { courses, isLoading, currentPage, totalPages, goToPage } =
    useGhostRunMapCourses(
      center,
      radiusM,
      preferredDistanceMs,
      sortBy,
      filterRequestNonce
    );

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setMapCourses(courses);
  }, [courses]);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    const keyword = searchKeyword.trim();
    if (keyword) chips.push(`검색: ${keyword}`);

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

    if (sortBy === 'GHOST_RUN_COUNT') chips.push('고스트런 많은 순');

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
  }, [searchKeyword, appliedFilters, sortBy, categories]);

  useEffect(() => {
    if (!isLoading && courses.length > 0) {
      expand();
    }
  }, [isLoading, courses.length, expand]);

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
        {/* 시트 헤더 */}
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

          {/* 헤더 라벨 */}
          <div className="px-4 pb-3">
            <span className="body-l-b text-fg-primary">
              고스트런 코스
            </span>
          </div>
        </div>

        {/* 스크롤 가능한 코스 리스트 */}
        <div
          className={`flex-1 overflow-y-auto px-5 py-4 ${isDragging ? 'pointer-events-none' : ''}`}
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
                  onClick={() => navigate(`/ghost-run/${course.courseId}`)}
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
          { value: 'GHOST_RUN_COUNT', label: '고스트런 많은 순' },
        ]}
        onClose={() => setShowFilterDrawer(false)}
        onApply={applyFilters}
        onReset={handleResetFilters}
        onChange={handleFilterChange}
        onSortByChange={handleSortByChange}
        onDistanceRangeChange={handleDistanceRangeChange}
      />
    </div>
  );
}
