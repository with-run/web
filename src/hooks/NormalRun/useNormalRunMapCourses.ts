import { useEffect, useRef, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import {
  getNearbyCoursesApi,
  type GetNearbyCoursesData,
  type PreferredDistanceM,
} from '@/apis';
import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';

type Center = { latitude: number; longitude: number };

export function useNormalRunMapCourses(
  center: Center | null,
  radiusM: number,
  preferredDistanceMs: PreferredDistanceM[] = [],
  sortBy: 'DISTANCE' | 'POPULAR' = 'DISTANCE',
  refreshKey = 0
) {
  const safeSortBy = sortBy === 'POPULAR' ? 'POPULAR' : 'DISTANCE';
  const [currentPage, setCurrentPage] = useState(0);

  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);

  // gpsLocation은 쿼리 키에 포함하지 않음 (GPS 업데이트마다 refetch 방지)
  // queryFn 내부에서 최신값을 읽기 위해 ref 사용
  const gpsLocationRef = useRef(gpsLocation);
  useEffect(() => {
    gpsLocationRef.current = gpsLocation;
  }, [gpsLocation]);

  // 필터 적용/초기화(refreshKey) 포함 조건 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(0);
  }, [center, radiusM, preferredDistanceMs, safeSortBy, refreshKey]);

  const { data, isLoading, isFetching } = useQuery<GetNearbyCoursesData | null>({
    queryKey: [
      'nearbyCourses',
      center,
      radiusM,
      preferredDistanceMs,
      safeSortBy,
      refreshKey,
      currentPage,
    ],
    queryFn: async () => {
      if (!center) return null;
      const gps = gpsLocationRef.current;
      const { data } = await getNearbyCoursesApi({
        latitude: gps?.latitude ?? center.latitude,
        longitude: gps?.longitude ?? center.longitude,
        targetLatitude: center.latitude,
        targetLongitude: center.longitude,
        radiusM: Math.max(1000, Math.min(5000, radiusM)),
        preferredDistanceMs,
        sortBy: safeSortBy,
        page: currentPage,
        size: 3,
      });
      return data;
    },
    enabled: !!center,
    placeholderData: keepPreviousData,
  });

  return {
    courses: data?.items ?? [],
    isLoading: isLoading || isFetching,
    currentPage,
    totalPages: data?.totalPages ?? 0,
    goToPage: setCurrentPage,
  };
}
