import type { CourseStatus } from '../types';

// 코스 좋아요 응답 (POST /courses/{courseId}/like)
export type CourseLikeResponse = {
  courseId: number;
  isLiked: boolean;
  likeCount: number;
  status: CourseStatus;
};
