import type {
  CourseDifficulty,
  CourseType,
  CourseStatus,
  RouteType,
} from '../types';

// 러닝 모드
export type RunningMode = 'FREE' | 'COURSE' | 'GHOST';
// 코스 등록 모드 (개인 저장 or 커뮤니티 공개)
export type CourseRegistrationMode = 'PRIVATE' | 'COMMUNITY';
// 코스 세션 상태
export type CompleteState = 'SUCCESS' | 'FAIL' | 'GIVEUP';

// GET /running-sessions/history/past - 과거 러닝 세션 항목
export type RunningHistoryItem = {
  runningSessionId: number;
  startedAt: string;
  distanceM: number;
  durationSec: number | null;
  caloriesKcal: number;
  snapshotImageUrl: string | null;
  elevationGainM: number;
  completeState: CompleteState;
  runningMode: string;
  ghostResultStatus: string | null;
  timeSlot: string;
};

// GET /running-sessions/history/past 응답
export type GetRunningHistoryResponse = {
  items: RunningHistoryItem[];
  hasMore: boolean;
  nextCursor: string | null;
};

// GET /running-sessions/history/past 쿼리 파라미터
export type GetRunningHistoryParams = {
  year?: number;
  month?: number;
  day?: number;
  cursor?: string;
  pageSize?: number;
};

export type CreateRunningSessionRequest = {
  mode: RunningMode;
  courseId?: number;
  ghostTargetRunningSessionId?: number;
  startLatitude: number; // -90 ~ 90
  startLongitude: number; // -180 ~ 180
};

export type CreateRunningSessionResponse = {
  runningSessionId: number;
  mode: RunningMode;
  courseId: number | null;
  navigationBundleUrl: string | null;
  ghostTargetRunningSessionId: number | null;
  ghostTargetGpsSamples: GpsSample[] | null;
  distanceM: number;
  caloriesKcal: number;
  completeState: CompleteState;
};

// GPS 샘플 (1초 단위 수집)
export type GpsSample = {
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  accuracyM: number | null;
  bearingDeg: number | null;
  speedMps?: number | null;
  paceSecPerKm?: number | null;
  distanceM?: number | null;
  cadenceSpm?: number | null;
  sampledAt: string; // ISO 8601
};

// 헬스 샘플 (워치/모바일 1초 단위 수집)
export type HealthSample = {
  sampledAt: string; // ISO 8601
  heartRate: number;
  caloriesKcal: number;
};

// 1km 단위 구간 기록 (TODO: 추후 구현)
export type SplitRecord = {
  splitIndex: number;
  splitDistanceM: number;
  splitDurationSec: number;
  splitPaceSecPerKm: number;
  avgHeartRate: number;
  elevationGainM: number;
};

// PATCH /running-sessions/{id} 요청
export type CompleteRunningSessionRequest = {
  completeState: CompleteState;
  distanceM: number;
  caloriesKcal: number;
  endLatitude: number; // -90 ~ 90
  endLongitude: number; // -180 ~ 180
  avgSpeedMps: number;
  durationSec: number;
  avgPaceSecPerKm: number;
  elevationGainM: number;
  distanceGapM: number;
  gpsSamples: GpsSample[];
  healthSamples: HealthSample[];
  splits: SplitRecord[];
};

// 고스트러닝 결과 타입
export type GhostRunningResult = {
  ghostRunningResultId: number;
  runningSessionId: number;
  ghostTargetRunningSessionId: number;
  targetUserId: number;
  resultStatus: 'WIN' | 'LOSE' | 'DRAW';
  point: number;
  timeGapSec: number;
  distanceGapM: number;
  createdAt: string;
};

export type SplitResult = {
  splitIndex: number;
  splitDistanceM: number;
  splitDurationSec: number;
  splitPaceSecPerKm: number;
  avgHeartRate: number;
  elevationGainM: number;
};

// PATCH /running-sessions/{id} 응답
// 자유러닝에서는 ghostRunningResult: null
export type CompleteRunningSessionResponse = {
  completeState: CompleteState;
  runningSessionId: number;
  userId: number;
  snapshotImageUrl: string | null;
  startedAt: string;
  endedAt: string;
  distanceM: number;
  durationSec: number;
  avgSpeedMps: number;
  avgPaceSecPerKm: number;
  caloriesKcal: number;
  elevationGainM: number;
  gpsSamples: GpsSample[];
  healthSamples: HealthSample[];
  splits: SplitResult[];
  ghostRunningResult: GhostRunningResult | null;
};

// GET /running-sessions/{runningSessionId}/detail 응답
export type RunningSessionDetailResponse = {
  completeState: CompleteState;
  runningSessionId: number;
  userId: number;
  snapshotImageUrl: string | null;
  startedAt: string;
  endedAt: string | null;
  distanceM: number;
  durationSec: number;
  avgSpeedMps: number;
  avgPaceSecPerKm: number;
  caloriesKcal: number;
  elevationGainM: number;
  gpsSamples: GpsSample[];
  healthSamples: HealthSample[];
  splits: SplitResult[];
  ghostRunningResult: GhostRunningResult | null;
};

export type RegisterCourseRequest = {
  title: string;
  mode: CourseRegistrationMode;
  difficulty: CourseDifficulty;
  courseTypes: CourseType[];
  routeType: RouteType;
  snapshotImageUrl?: string;
};

export type RegisterCourseResponse = {
  courseId: number;
  title: string;
  status: CourseStatus;
  difficulty: { data: CourseDifficulty; label: string } | null;
  distanceM: number;
  elevationGainM: number;
  snapshotImageUrl: string | null;
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  coordinates: { latitude: number; longitude: number; elevationM: number }[];
};
