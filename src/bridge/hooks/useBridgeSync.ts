import { useEffect } from 'react';
import { bridge } from '../bridge';
import { useBridgeDataStore } from '../stores/useBridgeDataStore';

// 앱 루트에서 한 번만 호출 - 브릿지 이벤트를 글로벌 스토어에 동기화
export function useBridgeSync() {
  const setGpsLocation = useBridgeDataStore((s) => s.setGpsLocation);
  const setWatchHealthData = useBridgeDataStore((s) => s.setWatchHealthData);

  useEffect(() => {
    const unsubGps = bridge.addEventListener('gpsLocation', setGpsLocation);
    const unsubWatch = bridge.addEventListener('watchHealthData', setWatchHealthData);
    return () => {
      unsubGps();
      unsubWatch();
    };
  }, [setGpsLocation, setWatchHealthData]);
}
