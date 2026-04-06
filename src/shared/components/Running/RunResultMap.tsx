import { useRef } from 'react';

import type { GpsSample } from '@/apis/runningSessions';
import { useRunResultMap } from '@/shared/hooks/Running/useRunResultMap';

type RunResultMapProps = {
  gpsSamples: GpsSample[];
};

export function RunResultMap({ gpsSamples }: RunResultMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useRunResultMap(containerRef, gpsSamples);

  return <div ref={containerRef} className="w-full h-full" />;
}
