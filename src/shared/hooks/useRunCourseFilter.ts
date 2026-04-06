import { useEffect, useState } from 'react';

import {
  getNormalRunCourseFilterApi,
  type GetNormalRunCourseFilterData,
} from '@/apis';

export const useRunCourseFilter = () => {
  const [courseFilters, setCourseFilters] =
    useState<GetNormalRunCourseFilterData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCourseFilters = async () => {
    setIsLoading(true);
    try {
      const response = await getNormalRunCourseFilterApi();
      setCourseFilters(response.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseFilters();
  }, []);

  return { courseFilters, isLoading };
};
