import type { RunningCourseFilterState } from '@/shared/components';

export const INITIAL_FILTERS: RunningCourseFilterState = {
  distanceRange: { min: 0, max: 5000 },
  courseType: [],
  difficulty: [],
  sortBy: 'DISTANCE',
};
