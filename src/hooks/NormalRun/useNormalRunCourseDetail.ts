import { getCourseDetailApi, type CourseDetail } from '@/apis';
import { useEffect, useState } from 'react';

export const useNormalRunCourseDetail = (courseId: number | undefined) => {
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (courseId == null) return;

    const fetchCourseDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getCourseDetailApi(courseId);
        setCourseDetail(response.data);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('코스 정보를 불러오지 못했습니다.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseDetail();
  }, [courseId]);

  return { courseDetail, isLoading, error };
};
