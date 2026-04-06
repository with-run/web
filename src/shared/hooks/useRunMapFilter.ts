import { useMemo } from 'react';

import {
  type CourseFilterCategory,
  type RunningCourseFilterState,
} from '@/shared/components';
import { useRunCourseFilter } from './useRunCourseFilter';

export interface RunMapFilterStoreShape {
  showFilterDrawer: boolean;
  setShowFilterDrawer: (open: boolean) => void;
  filters: RunningCourseFilterState;
  appliedFilters: RunningCourseFilterState;
  filterRequestNonce: number;
  handleFilterChange: (key: 'courseType' | 'difficulty', value: string) => void;
  handleDistanceRangeChange: (range: { min: number; max: number }) => void;
  handleSortByChange: (sortBy: string) => void;
  handleResetFilters: () => void;
  applyFilters: () => void;
}

export const useRunMapFilter = (useFilterStore: () => RunMapFilterStoreShape) => {
  const {
    showFilterDrawer,
    setShowFilterDrawer,
    filters,
    appliedFilters,
    filterRequestNonce,
    handleFilterChange,
    handleDistanceRangeChange,
    handleSortByChange,
    handleResetFilters,
    applyFilters,
  } = useFilterStore();

  const { courseFilters } = useRunCourseFilter();

  const preferredDistanceMs = useMemo(() => {
    const { min, max } = appliedFilters.distanceRange;
    return [{ min: Math.max(1, min), max }];
  }, [appliedFilters.distanceRange]);

  const categories = useMemo<CourseFilterCategory[]>(() => {
    if (!courseFilters) return [];
    return [
      {
        key: 'courseType',
        label: '코스 타입',
        options: [
          { value: '전체', label: '전체' },
          ...courseFilters.courseTypes.map((o) => ({
            value: o.data,
            label: o.label,
          })),
        ],
      },
      {
        key: 'difficulty',
        label: '난이도',
        options: [
          { value: '전체', label: '전체' },
          ...courseFilters.difficulties.map((o) => ({
            value: o.data,
            label: o.label,
          })),
        ],
      },
    ];
  }, [courseFilters]);

  return {
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
  };
};
