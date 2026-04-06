import { useRef } from 'react';

import { useFreeRunningMap } from '@/hooks/FreeRun/useFreeRunningMap';

export function FreeRunningMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  useFreeRunningMap(containerRef);

  return <div ref={containerRef} className="absolute inset-0 z-base" />;
}
