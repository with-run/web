import { useEffect, useState } from 'react';
import { getCourseRegisterMetaApi } from '@/apis';
import type { GetCourseRegisterMetaResponse } from '@/apis';

export function useCourseSurveys(isOpen: boolean) {
  const [surveyData, setSurveyData] = useState<GetCourseRegisterMetaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Drawer가 열릴 때마다 설문 선택지 조회
  useEffect(() => {
    if (!isOpen) return;
    async function load() {
      setIsLoading(true);
      try {
        const res = await getCourseRegisterMetaApi();
        setSurveyData(res.data);
      } catch {
        setSurveyData(null);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [isOpen]);

  return { surveyData, isLoading };
}
