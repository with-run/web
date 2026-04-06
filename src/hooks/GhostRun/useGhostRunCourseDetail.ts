import { useEffect, useState } from 'react';

import { getGhostCourseDetailApi, type GhostCourseDetail } from '@/apis';

export function useGhostRunCourseDetail(courseId: number | undefined) {
  const [courseDetail, setCourseDetail] = useState<GhostCourseDetail | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!courseId) return;

    setIsLoading(true);
    setError(null);

    getGhostCourseDetailApi(courseId)
      .then((res) => setCourseDetail(res.data))
      .catch((err) =>
        setError(err instanceof Error ? err : new Error(String(err)))
      )
      .finally(() => setIsLoading(false));
  }, [courseId]);

  return { courseDetail, isLoading, error };
}
