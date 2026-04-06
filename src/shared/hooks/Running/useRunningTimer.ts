// 러닝 세션 타이머 훅 (FreeRun / NormalRun 공용)
// 책임: 일시정지 인식 타이머 (elapsed time 누적)

import { useState, useEffect, useCallback, useRef } from 'react';

import { formatTime } from '@/shared/utils';

export function useRunningTimer({ forcedPaused = false }: { forcedPaused?: boolean } = {}) {
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0); // seconds

  const startTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const effectivePaused = isPaused || forcedPaused;

  useEffect(() => {
    if (effectivePaused) {
      if (startTimeRef.current !== null) {
        elapsedRef.current += Date.now() - startTimeRef.current;
        startTimeRef.current = null;
      }
      return;
    }

    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      if (startTimeRef.current === null) return;
      setTime(Math.floor((elapsedRef.current + (Date.now() - startTimeRef.current)) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [effectivePaused]);

  const togglePause = useCallback(() => setIsPaused((prev) => !prev), []);

  return {
    durationSec: time,
    formattedTime: formatTime(time),
    isPaused,
    isEffectivelyPaused: effectivePaused,
    togglePause,
  };
}
