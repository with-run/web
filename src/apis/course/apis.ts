import axiosClient from '@/shared/libs/axiosClient';
import type { ApiResponse } from '../types';
import type { GhostRunningResult } from '../runningSessions';
import type {
  GetNearbyCoursesParams,
  GetNearbyCoursesData,
  CourseDetail,
  GetGhostLeaderboardParams,
  GetGhostLeaderboardData,
  GhostCourseDetail,
  GetNearbyGhostCoursesParams,
  PostCourseReviewRequest,
  PostCourseReviewResponse,
} from './types';

/**
 * 사용자 주변 코스 데이터 받는 API
 */
export const getNearbyCoursesApi = async (
  params: GetNearbyCoursesParams
): Promise<ApiResponse<GetNearbyCoursesData>> => {
  const { preferredDistanceMs, ...rest } = params;
  const { data } = await axiosClient.get<ApiResponse<GetNearbyCoursesData>>(
    '/courses/nearby',
    {
      params: rest,
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            sp.append(key, String(value));
          }
        });
        preferredDistanceMs.forEach((item, i) => {
          sp.append(`preferredDistanceMs[${i}].min`, String(item.min));
          sp.append(`preferredDistanceMs[${i}].max`, String(item.max));
        });
        return sp.toString();
      },
    }
  );
  return data;
};

/**
 * 코스 상세 데이터 받는 API
 */
export const getCourseDetailApi = async (
  courseId: number
): Promise<ApiResponse<CourseDetail>> => {
  const { data } = await axiosClient.get<ApiResponse<CourseDetail>>(
    `/courses/${courseId}`
  );
  return data;
};

/**
 * 코스 고스트 리더보드 조회
 * GET /courses/{courseId}/ghost-leaderboard
 */
export const getGhostLeaderboardApi = async (
  courseId: number,
  params: GetGhostLeaderboardParams = {}
): Promise<ApiResponse<GetGhostLeaderboardData>> => {
  const { data } = await axiosClient.get<ApiResponse<GetGhostLeaderboardData>>(
    `/courses/${courseId}/ghost-leaderboard`,
    { params }
  );
  return data;
};

/**
 * 코스 고스트 상세 조회 (고스트런 진입 시)
 * GET /courses/{courseId}/ghost-detail
 */
export const getGhostCourseDetailApi = async (
  courseId: number
): Promise<ApiResponse<GhostCourseDetail>> => {
  const { data } = await axiosClient.get<ApiResponse<GhostCourseDetail>>(
    `/courses/${courseId}/ghost-detail`
  );
  return data;
};

/**
 * 주변 고스트 런 코스 조회
 * GET /courses/nearby/ghost
 */
export const getNearbyGhostCoursesApi = async (
  params: GetNearbyGhostCoursesParams
): Promise<ApiResponse<GetNearbyCoursesData>> => {
  const { preferredDistanceMs, ...rest } = params;
  const { data } = await axiosClient.get<ApiResponse<GetNearbyCoursesData>>(
    '/courses/nearby/ghost',
    {
      params: rest,
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            sp.append(key, String(value));
          }
        });
        preferredDistanceMs.forEach((item, i) => {
          sp.append(`preferredDistanceMs[${i}].min`, String(item.min));
          sp.append(`preferredDistanceMs[${i}].max`, String(item.max));
        });
        return sp.toString();
      },
    }
  );
  return data;
};

/**
 * 고스트 러닝 결과 조회
 * GET /ghost-runnings/{runningSessionId}/result
 */
export const getGhostRunningResultApi = async (
  runningSessionId: number
): Promise<ApiResponse<GhostRunningResult>> => {
  const { data } = await axiosClient.get<ApiResponse<GhostRunningResult>>(
    `/ghost-runnings/${runningSessionId}/result`
  );
  return data;
};

/**
 * 추천 코스 조회
 * GET /courses/nearby/recommended
 */
export const getRecommendedCoursesApi = async (
  params: GetNearbyCoursesParams
): Promise<ApiResponse<GetNearbyCoursesData>> => {
  const { preferredDistanceMs, ...rest } = params;
  const { data } = await axiosClient.get<ApiResponse<GetNearbyCoursesData>>(
    '/courses/nearby/recommended',
    {
      params: rest,
      paramsSerializer: (p) => {
        const sp = new URLSearchParams();
        Object.entries(p).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            sp.append(key, String(value));
          }
        });
        preferredDistanceMs.forEach((item, i) => {
          sp.append(`preferredDistanceMs[${i}].min`, String(item.min));
          sp.append(`preferredDistanceMs[${i}].max`, String(item.max));
        });
        return sp.toString();
      },
    }
  );
  return data;
};

/**
 * 코스 스냅샷 이미지 업로드
 * POST /files/course-snapshots/{courseId}
 */
export const uploadCourseSnapshotApi = async (
  courseId: number,
  file: Blob
): Promise<void> => {
  const formData = new FormData();
  formData.append('file', file, 'snapshot.png');
  await axiosClient.post(`/files/course-snapshots/${courseId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/**
 * 코스 리뷰 작성
 * POST /courses/{courseId}/reviews
 */
export const postCourseReviewApi = async (
  courseId: number,
  body: PostCourseReviewRequest
): Promise<ApiResponse<PostCourseReviewResponse>> => {
  const { data } = await axiosClient.post<
    ApiResponse<PostCourseReviewResponse>
  >(`/courses/${courseId}/reviews`, body);
  return data;
};
