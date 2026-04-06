// response 스키마
export type ApiResponse<T = undefined> = {
  success: boolean;
  code: string;
  message: string;
  data: T;
  traceId: string;
};

// 코스 종류
export type CourseStatus = 'OFFICIAL' | 'COMMUNITY' | 'PRIVATE';
// 코스 난이도
export type CourseDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
// 코스 유형
export type CourseType =
  | 'RIVERSIDE'
  | 'PARK'
  | 'MOUNTAIN_TRAIL'
  | 'TRACK'
  | 'URBAN'
  | 'OTHER';
// 코스 경로 타입
export type RouteType = 'LOOP' | 'OUT_AND_BACK';
