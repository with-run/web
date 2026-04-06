import { useEffect, useState } from 'react';
import { getRunningSessionDetailApi } from '@/apis/runningSessions';
import type { RunningSessionDetailResponse } from '@/apis/runningSessions';

export function useCalendarDetail(runningSessionId: number) {
  const [detail, setDetail] = useState<RunningSessionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    getRunningSessionDetailApi(runningSessionId)
      .then((res) => { if (!cancelled) setDetail(res.data); })
      .catch(() => { if (!cancelled) setIsError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [runningSessionId]);

  return { detail, isLoading, isError };
}
