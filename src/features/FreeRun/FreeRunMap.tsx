import { useFreeRunMap } from '@/hooks/FreeRun/useFreeRunMap';

export function FreeRunMap() {
  const { containerRef } = useFreeRunMap();

  return <div ref={containerRef} className="absolute inset-0 z-base" />;
}
