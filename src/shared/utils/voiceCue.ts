import type { VoiceCueKey } from '@bridge';

import { bridge } from '@/bridge';

export function pickRandomVoiceCue<T extends VoiceCueKey>(keys: readonly T[]): T {
  if (keys.length === 1) return keys[0];
  const idx = Math.floor(Math.random() * keys.length);
  return keys[idx] ?? keys[0];
}

export async function playVoiceCueOnBridge(key: VoiceCueKey): Promise<void> {
  if (!bridge.isWebViewBridgeAvailable) return;

  try {
    await bridge.playVoiceCue(key);
  } catch {
    // noop
  }
}
