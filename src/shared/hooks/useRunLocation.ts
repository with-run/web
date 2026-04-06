import { useEffect, useState } from 'react';

import type { GpsLocation } from '@bridge';
import { useBridgeDataStore } from '@/bridge/stores/useBridgeDataStore';

// 모바일 브릿지 GPS를 우선 사용하고, 없으면 브라우저 Geolocation API로 폴백
export function useRunLocation(): { location: GpsLocation | null } {
  const bridgeLocation = useBridgeDataStore((s) => s.gpsLocation);
  const [browserLocation, setBrowserLocation] = useState<GpsLocation | null>(null);

  useEffect(() => {
    // 브릿지 GPS 데이터가 있으면 watchPosition 불필요
    if (bridgeLocation !== null) return;

    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setBrowserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          heading: coords.heading,
          speedMps: coords.speed,
          cadenceSpm: null,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [bridgeLocation]);

  return { location: bridgeLocation ?? browserLocation };
}
