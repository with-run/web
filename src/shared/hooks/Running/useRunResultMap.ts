import { useEffect } from 'react';

import type { GpsSample } from '@/apis/runningSessions';
import { loadKakaoMapSdk } from '@/shared/libs';
import { createMarkerContent, createRoutePolyline } from '@/shared/kakaoMap';

export function useRunResultMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  gpsSamples: GpsSample[],
): void {
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;

    loadKakaoMapSdk().then(() => {
      if (cancelled) return;
      const first = gpsSamples[0];
      const center = first
        ? new kakao.maps.LatLng(first.latitude, first.longitude)
        : new kakao.maps.LatLng(37.5665, 126.978);

      const map = new kakao.maps.Map(container, { center, level: 5 });

      if (gpsSamples.length >= 2) {
        const path = gpsSamples.map((s) => new kakao.maps.LatLng(s.latitude, s.longitude));

        createRoutePolyline(path).setMap(map);

        const bounds = new kakao.maps.LatLngBounds();
        path.forEach((latLng) => bounds.extend(latLng));
        map.setBounds(bounds);

        new kakao.maps.CustomOverlay({
          map,
          position: path[0],
          content: createMarkerContent('출발', '#22C55E'),
          xAnchor: 0.5,
          yAnchor: 0.5,
        });

        new kakao.maps.CustomOverlay({
          map,
          position: path[path.length - 1],
          content: createMarkerContent('도착', '#EF4444'),
          xAnchor: 0.5,
          yAnchor: 0.5,
        });
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);
}
