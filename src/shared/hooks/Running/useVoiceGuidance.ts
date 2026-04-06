import type { VoiceCueKey } from '@bridge';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { VOICE_CUE_TEXT } from '@/shared/constants/voiceCueText';
import { useNavigationBundle } from '@/shared/hooks/Running/useNavigationBundle';
import { haversineM } from '@/shared/utils/geo';
import { pickRandomVoiceCue, playVoiceCueOnBridge } from '@/shared/utils/voiceCue';

const HEART_RATE_HIGH_THRESHOLD = 165;
const HEART_RATE_VERY_HIGH_THRESHOLD = 180;
const HEART_RATE_HIGH_COOLDOWN_MS = 60_000;
const HEART_RATE_VERY_HIGH_COOLDOWN_MS = 45_000;

interface UseVoiceGuidanceParams {
  sessionId: number | null;
  navigationBundleUrl: string | null | undefined;
  routeProgressM: number;
  currentLatitude: number | null;
  currentLongitude: number | null;
  isDeviating: boolean;
  isPaused: boolean;
  heartRate: number;
}

export function useVoiceGuidance({
  sessionId,
  navigationBundleUrl,
  routeProgressM,
  currentLatitude,
  currentLongitude,
  isDeviating,
  isPaused,
  heartRate,
}: UseVoiceGuidanceParams) {
  const { cues } = useNavigationBundle(navigationBundleUrl);

  const startedSessionIdRef = useRef<number | null>(null);
  const firedCueIdsRef = useRef<Set<string>>(new Set());
  const prevDeviatingRef = useRef<boolean>(false);
  const lastHeartHighAtRef = useRef<number>(0);
  const lastHeartVeryHighAtRef = useRef<number>(0);

  const announceCue = (key: VoiceCueKey) => {
    void playVoiceCueOnBridge(key);
    toast.message(VOICE_CUE_TEXT[key], { duration: 2200 });
  };

  useEffect(() => {
    if (!sessionId) {
      startedSessionIdRef.current = null;
      firedCueIdsRef.current.clear();
      prevDeviatingRef.current = false;
      return;
    }

    if (startedSessionIdRef.current === sessionId) {
      return;
    }

    startedSessionIdRef.current = sessionId;
    firedCueIdsRef.current.clear();
    prevDeviatingRef.current = false;
    lastHeartHighAtRef.current = 0;
    lastHeartVeryHighAtRef.current = 0;

    announceCue(pickRandomVoiceCue(['start_01', 'start_02']));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || isPaused || cues.length === 0) return;

    const reached = cues
      .filter((cue) => {
        if (routeProgressM < cue.triggerDistanceM) return false;

        if (
          cue.anchorLat === null ||
          cue.anchorLon === null ||
          currentLatitude === null ||
          currentLongitude === null
        ) {
          return true;
        }

        const distanceToAnchor = haversineM(
          currentLatitude,
          currentLongitude,
          cue.anchorLat,
          cue.anchorLon
        );

        return distanceToAnchor <= cue.radiusM;
      })
      .filter((cue) => !firedCueIdsRef.current.has(cue.id));

    if (reached.length === 0) return;

    const nextCue = reached[0];
    firedCueIdsRef.current.add(nextCue.id);
    announceCue(nextCue.key);
  }, [cues, currentLatitude, currentLongitude, isPaused, routeProgressM, sessionId]);

  useEffect(() => {
    if (!sessionId || isPaused) {
      prevDeviatingRef.current = isDeviating;
      return;
    }

    const prev = prevDeviatingRef.current;

    if (!prev && isDeviating) {
      announceCue(pickRandomVoiceCue(['off_course_01', 'off_course_02']));
    } else if (prev && !isDeviating) {
      announceCue(pickRandomVoiceCue(['stable_back_01', 'stable_back_02']));
    }

    prevDeviatingRef.current = isDeviating;
  }, [isDeviating, isPaused, sessionId]);

  useEffect(() => {
    if (!sessionId || isPaused || heartRate <= 0) return;

    const now = Date.now();

    if (heartRate >= HEART_RATE_VERY_HIGH_THRESHOLD) {
      if (now - lastHeartVeryHighAtRef.current < HEART_RATE_VERY_HIGH_COOLDOWN_MS) {
        return;
      }

      lastHeartVeryHighAtRef.current = now;
      announceCue(pickRandomVoiceCue(['heart_rate_very_high_01', 'heart_rate_very_high_02']));
      return;
    }

    if (heartRate >= HEART_RATE_HIGH_THRESHOLD) {
      if (now - lastHeartHighAtRef.current < HEART_RATE_HIGH_COOLDOWN_MS) {
        return;
      }

      lastHeartHighAtRef.current = now;
      announceCue(pickRandomVoiceCue(['heart_rate_high_01', 'heart_rate_high_02']));
    }
  }, [heartRate, isPaused, sessionId]);
}
