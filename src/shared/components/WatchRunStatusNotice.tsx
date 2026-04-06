import { Watch } from 'lucide-react';
import { useEffect, useState } from 'react';

import { bridge, useBridgeDataStore } from '@/bridge';

const WATCH_CONNECTION_TIMEOUT_MS = 5000;

type WatchRunStatusNoticeProps = {
  className?: string;
};

export function WatchRunStatusNotice({ className }: WatchRunStatusNoticeProps) {
  const lastWatchMessageAt = useBridgeDataStore((state) => state.lastWatchMessageAt);
  const [now, setNow] = useState(() => Date.now());
  const isConnected =
    bridge.isWebViewBridgeAvailable &&
    lastWatchMessageAt !== null &&
    now - lastWatchMessageAt < WATCH_CONNECTION_TIMEOUT_MS;

  useEffect(() => {
    if (!bridge.isWebViewBridgeAvailable) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const statusLabel = isConnected ? '연결됨' : '미연결';
  const message = isConnected
    ? '러닝 시작/종료가 워치 측정과 자동 동기화됩니다.'
    : '워치 앱을 켜두면 심박/경로 동기화와 자동 측정 시작이 동작합니다.';

  return (
    <div
      className={[
        'rounded-2xl border px-4 py-3 shadow-md',
        isConnected
          ? 'border-success/[0.4] bg-success/[0.12]'
          : 'border-border-default bg-surface-default/[0.9]',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        <Watch
          size={16}
          className={
            isConnected
              ? 'text-success'
              : 'text-fg-secondary'
          }
        />
        <span className="caption-b text-fg-primary">
          워치 연동 {statusLabel}
        </span>
      </div>
      <p className="mt-1 body-r text-fg-secondary">{message}</p>
    </div>
  );
}
