import { useEffect, useState } from 'react';

import { bridge, useBridgeDataStore } from '@/bridge';

const WATCH_CONNECTION_TIMEOUT_MS = 5000;

export function useHealthConnectionStatus() {
  const lastWatchMessageAt = useBridgeDataStore(
    (state) => state.lastWatchMessageAt,
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const isConnected =
    bridge.isWebViewBridgeAvailable &&
    lastWatchMessageAt !== null &&
    currentTime - lastWatchMessageAt < WATCH_CONNECTION_TIMEOUT_MS;

  useEffect(() => {
    if (!bridge.isWebViewBridgeAvailable) {
      return;
    }

    // 서버 상태가 아니라 "이 기기에서 최근 워치 메시지가 들어왔는지"만으로 배지 ON/OFF 를 계산한다.
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    isConnected,
    label: isConnected ? 'HEALTH CONNECT ON' : 'HEALTH CONNECT OFF',
  };
}
