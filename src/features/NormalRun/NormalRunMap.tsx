import { useRef } from 'react';

import type { CoordinatePoint } from '@/apis';
import type { Checkpoint } from '@/shared/hooks/useRunCheckpoints';
import type { RouteType } from '@/apis';
import { useNormalRunMap } from '@/hooks/NormalRun/useNormalRunMap';

type NormalRunMapProps = {
  coordinates: CoordinatePoint[];
  routeType?: RouteType;
  courseAnchor: { latitude: number; longitude: number } | null;
  checkpoints?: Checkpoint[];
  visitedCount?: number;
  nextCheckpointIdx?: number;
};

export function NormalRunMap({
  coordinates,
  routeType,
  courseAnchor,
  checkpoints,
  visitedCount,
  nextCheckpointIdx,
}: NormalRunMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useNormalRunMap(containerRef, {
    coordinates,
    routeType,
    courseAnchor,
    checkpoints,
    visitedCount,
    nextCheckpointIdx,
  });

  return <div ref={containerRef} className="absolute inset-0 z-base" />;
}
