import React, { useRef } from 'react';

import type { CoordinatePoint } from '@/apis';
import type { Checkpoint } from '@/shared/hooks/useRunCheckpoints';
import type { RouteType } from '@/apis';
import { useGhostRunMap } from '@/hooks/GhostRun/useGhostRunMap';

type GhostRunMapProps = {
  coordinates: CoordinatePoint[];
  routeType?: RouteType;
  courseAnchor: { latitude: number; longitude: number } | null;
  ghostDurationSec: number;
  isPaused: boolean;
  ghostDistanceMRef?: React.MutableRefObject<number>;
  onGhostFinished?: () => void;
  checkpoints?: Checkpoint[];
  visitedCount?: number;
  nextCheckpointIdx?: number;
};

export function GhostRunMap({
  coordinates,
  routeType,
  courseAnchor,
  ghostDurationSec,
  isPaused,
  ghostDistanceMRef,
  onGhostFinished,
  checkpoints,
  visitedCount,
  nextCheckpointIdx,
}: GhostRunMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useGhostRunMap(containerRef, {
    coordinates,
    routeType,
    courseAnchor,
    ghostDurationSec,
    isPaused,
    ghostDistanceMRef,
    onGhostFinished,
    checkpoints,
    visitedCount,
    nextCheckpointIdx,
  });

  return <div ref={containerRef} className="absolute inset-0 z-base" />;
}
