import { useState } from 'react';
import { FreeRunningScreen, FreeRunResultScreen } from '@/features/FreeRun';
import { useFreeRunSessionStore } from '@/stores/FreeRun';
import type { RunningResult } from '@/features/FreeRun/FreeRunningScreen';

export function FreeRunSessionPage() {
  const session = useFreeRunSessionStore((s) => s.session);
  const [result, setResult] = useState<RunningResult | null>(null);
  const [courseId, setCourseId] = useState<number | null>(null);

  if (result) {
    return (
      <FreeRunResultScreen
        result={result}
        courseId={courseId}
        runningSessionId={session?.runningSessionId ?? null}
        onCourseRegistered={setCourseId}
      />
    );
  }

  return (
    <FreeRunningScreen
      runningSessionId={session?.runningSessionId ?? null}
      onFinish={setResult}
    />
  );
}
