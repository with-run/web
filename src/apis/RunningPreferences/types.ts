import type { CourseType } from '../types';

// 백엔드 enum 과 정확히 같은 문자열만 허용해서 잘못된 저장값이 섞이지 않게 한다.
export type Purpose =
  | 'DIET'
  | 'HEALTH_MAINTENANCE'
  | 'RACE_PREPARATION'
  | 'ENDURANCE_IMPROVEMENT';

export type TimeSlot = 'DAWN' | 'MORNING' | 'AFTERNOON' | 'EVENING';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type UserRunningPreferenceResponse = {
  purposes: Purpose[];
  timeSlots: TimeSlot[];
  preferredDistanceKm: number | null;
  preferredDifficulty: Difficulty | null;
  courseTypes: CourseType[];
};

export type UpdateUserRunningPreferenceRequest = {
  purposes: Purpose[];
  timeSlots: TimeSlot[];
  preferredDistanceKm: number;
  preferredDifficulty: Difficulty;
  courseTypes: CourseType[];
};
