import axiosClient from '@/shared/libs/axiosClient';
import type { ApiResponse } from '../types';
import type { CourseLikeResponse } from './types';

/**
 * 코스 좋아요 API
 * POST /courses/{courseId}/like
 */
export const likeCourse = async (
  courseId: number
): Promise<ApiResponse<CourseLikeResponse>> => {
  const { data } = await axiosClient.post<ApiResponse<CourseLikeResponse>>(
    `/courses/${courseId}/like`
  );
  return data;
};
