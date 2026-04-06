import type {
  CourseDifficulty,
  CourseStatus,
  CourseType,
  RouteType,
} from '../types';

export type PostCourseReviewRequest = {
  rating: number;
  courseTypes: CourseType[];
  submittedDifficulty: CourseDifficulty;
};

export type PostCourseReviewResponse = {
  courseReviewId: number;
  courseId: number;
  rating: number;
  courseTypes: { data: string; label: string }[];
  submittedDifficulty: { data: string; label: string };
  createdAt: string;
};

export type CoordinatePoint = {
  latitude: number;
  longitude: number;
  elevationM: number;
};

// 코스 상세
export type CourseDetail = {
  courseId: number;
  title: string;
  status: CourseStatus;
  routeType: RouteType;
  difficulty: { data: CourseDifficulty; label: string } | null;
  distanceM: number;
  elevationGainM: number;
  snapshotImageUrl: string | null;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  coordinates: CoordinatePoint[];
  courseTypes: { data: CourseType; label: string }[];
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  averageRating: number | null;
};

// 코스 리스트
export type CourseItem = {
  courseId: number;
  title: string;
  status: CourseStatus;
  routeType: RouteType;
  distanceM: number;
  elevationGainM: number;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  distanceFromUserM: number;
  distanceFromTargetM: number;
  difficulty: { data: string; label: string } | null;
  courseTypes: { data: string; label: string }[];
  isRecommended: boolean;
  snapshotImageUrl: string | null;
  likeCount: number;
  bookmarkCount: number;
};

export type PreferredDistanceM = { min: number; max: number };

export type GetNearbyCoursesParams = {
  latitude: number;
  longitude: number;
  targetLatitude: number;
  targetLongitude: number;
  radiusM: number;
  preferredDistanceMs: PreferredDistanceM[];
  sortBy?: 'DISTANCE' | 'POPULAR';
  page?: number;
  size?: number;
};

export type GetNearbyCoursesData = {
  items: CourseItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

// 고스트 리더보드 아이템
export type GhostLeaderboardItem = {
  leaderboardId: number;
  userId: number;
  nickname: string;
  runningSessionId: number;
  point: number;
  rank: number;
  createdAt: string;
};

// GET /courses/{courseId}/ghost-leaderboard 쿼리 파라미터
export type GetGhostLeaderboardParams = {
  size?: number;
  cursor?: string;
};

// GET /courses/{courseId}/ghost-leaderboard 응답
export type GetGhostLeaderboardData = {
  items: GhostLeaderboardItem[];
  routeType: RouteType;
  hasMore: boolean;
  nextCursor: string | null;
};

// 내 고스트 기록 (ghost-detail myRecord)
export type GhostMyRecord = {
  leaderboardId: number;
  runningSessionId: number;
  durationSec: number;
  point: number;
  rank: number;
  createdAt: string;
};

// GET /courses/{courseId}/ghost-detail 응답
export type GhostCourseDetail = {
  courseId: number;
  title: string;
  status: CourseStatus;
  routeType: RouteType;
  difficulty: { data: CourseDifficulty; label: string } | null;
  distanceM: number;
  elevationGainM: number;
  snapshotImageUrl: string | null;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  coordinates: CoordinatePoint[];
  courseTypes: { data: CourseType; label: string }[];
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  averageRating: number;
  myRecord: GhostMyRecord | null;
};

// GET /courses/nearby/ghost 쿼리 파라미터
// sortBy: 'DISTANCE' | 'GHOST_RUN_COUNT' (일반 코스와 다름)
// 응답은 GetNearbyCoursesData 재사용
export type GetNearbyGhostCoursesParams = {
  latitude: number;
  longitude: number;
  targetLatitude: number;
  targetLongitude: number;
  radiusM: number;
  preferredDistanceMs: PreferredDistanceM[];
  sortBy?: 'DISTANCE' | 'GHOST_RUN_COUNT';
  page?: number;
  size?: number;
};
