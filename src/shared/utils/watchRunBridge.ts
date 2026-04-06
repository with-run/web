import type { WatchLatLng, WatchRunMode, WatchRunStartPayload } from '@bridge';

import { bridge } from '@/bridge';

type StartWatchRunSyncParams = {
  runningSessionId: number;
  mode: WatchRunMode;
  courseCoordinates?: WatchLatLng[];
  ghostCoordinates?: WatchLatLng[];
};

export async function startWatchRunSync({
  runningSessionId,
  mode,
  courseCoordinates = [],
  ghostCoordinates = [],
}: StartWatchRunSyncParams): Promise<void> {
  if (!bridge.isWebViewBridgeAvailable) return;

  const payload: WatchRunStartPayload = {
    runningSessionId,
    mode,
    courseCoordinates,
    ghostCoordinates,
  };

  try {
    await bridge.startWatchRunSync(payload);
  } catch {
    // noop
  }
}

export async function stopWatchRunSync(): Promise<void> {
  if (!bridge.isWebViewBridgeAvailable) return;
  try {
    await bridge.stopWatchRunSync();
  } catch {
    // noop
  }
}

