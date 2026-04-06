import { useEffect, useMemo, useState } from 'react';

import type {
  NavigationBundle,
  NavigationBundleManeuver,
  NavigationCue,
} from '@/shared/types/navigationBundle';
import { haversineM } from '@/shared/utils/geo';

const TURN_THRESHOLDS_M = [100, 70, 50, 30, 10] as const;
const CUE_RADIUS_M = 25;

const LEFT_TURN_KEYS = {
  100: 'direction_left_100m',
  70: 'direction_left_70m',
  50: 'direction_left_50m',
  30: 'direction_left_30m',
  10: 'direction_left_10m',
} as const;

const RIGHT_TURN_KEYS = {
  100: 'direction_right_100m',
  70: 'direction_right_70m',
  50: 'direction_right_50m',
  30: 'direction_right_30m',
  10: 'direction_right_10m',
} as const;

type TurnDirection = 'LEFT' | 'RIGHT' | 'TURNAROUND' | 'ARRIVAL' | 'UNKNOWN';

function inferDirection(maneuver: NavigationBundleManeuver): TurnDirection {
  const rawType = (maneuver.type ?? '').toUpperCase();
  const instruction = (maneuver.instruction ?? '').toLowerCase();
  const delta = maneuver.deltaDegrees ?? null;

  if (
    rawType.includes('ARRIVAL') ||
    instruction.includes('도착') ||
    instruction.includes('목적지')
  ) {
    return 'ARRIVAL';
  }

  if (
    rawType.includes('UTURN') ||
    rawType.includes('U_TURN') ||
    rawType.includes('TURNAROUND') ||
    instruction.includes('반환점')
  ) {
    return 'TURNAROUND';
  }

  if (rawType.includes('LEFT') || instruction.includes('왼쪽')) {
    return 'LEFT';
  }

  if (rawType.includes('RIGHT') || instruction.includes('오른쪽')) {
    return 'RIGHT';
  }

  if (delta !== null) {
    if (delta <= -20) return 'LEFT';
    if (delta >= 20) return 'RIGHT';
  }

  return 'UNKNOWN';
}

function toTurnCues(
  maneuverIndex: number,
  maneuverDistanceM: number,
  direction: TurnDirection,
  anchor: { lat: number | null; lon: number | null }
): NavigationCue[] {
  if (direction !== 'LEFT' && direction !== 'RIGHT') {
    return [];
  }

  const keys = direction === 'LEFT' ? LEFT_TURN_KEYS : RIGHT_TURN_KEYS;

  const cues: NavigationCue[] = [];
  TURN_THRESHOLDS_M.forEach((threshold) => {
    const triggerDistanceM = maneuverDistanceM - threshold;
    if (triggerDistanceM < 0) {
      return;
    }

    cues.push({
      id: `turn:${maneuverIndex}:${threshold}`,
      triggerDistanceM,
      key: keys[threshold],
      anchorLat: anchor.lat,
      anchorLon: anchor.lon,
      radiusM: CUE_RADIUS_M,
    });
  });

  return cues;
}

function toSpecialCues(
  maneuverIndex: number,
  maneuverDistanceM: number,
  direction: TurnDirection,
  anchor: { lat: number | null; lon: number | null }
): NavigationCue[] {
  if (direction === 'TURNAROUND') {
    const cues: NavigationCue[] = [];
    if (maneuverDistanceM >= 70) {
      cues.push({
        id: `turnaround:${maneuverIndex}:70`,
        triggerDistanceM: maneuverDistanceM - 70,
        key: 'turnaround_01',
        anchorLat: anchor.lat,
        anchorLon: anchor.lon,
        radiusM: CUE_RADIUS_M,
      });
    }
    if (maneuverDistanceM >= 10) {
      cues.push({
        id: `turnaround:${maneuverIndex}:10`,
        triggerDistanceM: maneuverDistanceM - 10,
        key: 'turnaround_02',
        anchorLat: anchor.lat,
        anchorLon: anchor.lon,
        radiusM: CUE_RADIUS_M,
      });
    }
    return cues;
  }

  if (direction === 'ARRIVAL') {
    const cues: NavigationCue[] = [];
    if (maneuverDistanceM >= 30) {
      cues.push({
        id: `arrival:${maneuverIndex}:30`,
        triggerDistanceM: maneuverDistanceM - 30,
        key: 'destination_01',
        anchorLat: anchor.lat,
        anchorLon: anchor.lon,
        radiusM: CUE_RADIUS_M,
      });
    }

    if (maneuverDistanceM >= 5) {
      cues.push({
        id: `arrival:${maneuverIndex}:5`,
        triggerDistanceM: maneuverDistanceM - 5,
        key: 'destination_02',
        anchorLat: anchor.lat,
        anchorLon: anchor.lon,
        radiusM: CUE_RADIUS_M,
      });
    }
    return cues;
  }

  return [];
}

function getCueAnchorFromDistance(
  bundle: NavigationBundle,
  triggerDistanceM: number
): { lat: number | null; lon: number | null } {
  const shape = bundle.shape ?? [];
  if (shape.length === 0) {
    return { lat: null, lon: null };
  }

  const segments = bundle.segments ?? [];
  const normalizedDistance = Math.max(0, triggerDistanceM);

  if (segments.length > 0) {
    for (const seg of segments) {
      if (normalizedDistance > seg.endCumulativeDistanceMeters) continue;
      if (normalizedDistance < seg.startCumulativeDistanceMeters) continue;

      const start = shape[seg.startShapeIndex];
      const end = shape[seg.endShapeIndex];
      if (!start || !end) break;

      const segmentRange =
        seg.endCumulativeDistanceMeters - seg.startCumulativeDistanceMeters;
      const t =
        segmentRange > 0
          ? (normalizedDistance - seg.startCumulativeDistanceMeters) /
            segmentRange
          : 0;

      return {
        lat: start.lat + (end.lat - start.lat) * t,
        lon: start.lon + (end.lon - start.lon) * t,
      };
    }
  }

  const cumulative: number[] = [0];
  for (let i = 1; i < shape.length; i++) {
    cumulative.push(
      cumulative[i - 1] +
        haversineM(shape[i - 1].lat, shape[i - 1].lon, shape[i].lat, shape[i].lon)
    );
  }

  for (let i = 0; i < shape.length - 1; i++) {
    const startDist = cumulative[i];
    const endDist = cumulative[i + 1];
    if (normalizedDistance < startDist || normalizedDistance > endDist) continue;

    const start = shape[i];
    const end = shape[i + 1];
    const segmentRange = endDist - startDist;
    const t = segmentRange > 0 ? (normalizedDistance - startDist) / segmentRange : 0;

    return {
      lat: start.lat + (end.lat - start.lat) * t,
      lon: start.lon + (end.lon - start.lon) * t,
    };
  }

  const last = shape[shape.length - 1];
  return { lat: last.lat, lon: last.lon };
}

function extractNavigationCues(bundle: NavigationBundle): NavigationCue[] {
  const maneuvers = bundle.maneuvers ?? [];
  const shape = bundle.shape ?? [];

  const rawCues = maneuvers.flatMap((maneuver, maneuverIndex) => {
      const maneuverDistanceM = maneuver.cumulativeDistanceMeters ?? null;
      if (maneuverDistanceM === null || !Number.isFinite(maneuverDistanceM)) {
        return [];
      }

      const direction = inferDirection(maneuver);
      const maneuverAnchor =
        maneuver.shapeIndex !== null &&
        maneuver.shapeIndex !== undefined &&
        shape[maneuver.shapeIndex]
          ? {
              lat: shape[maneuver.shapeIndex].lat,
              lon: shape[maneuver.shapeIndex].lon,
            }
          : getCueAnchorFromDistance(bundle, maneuverDistanceM);

      return [
        ...toTurnCues(maneuverIndex, maneuverDistanceM, direction, maneuverAnchor),
        ...toSpecialCues(maneuverIndex, maneuverDistanceM, direction, maneuverAnchor),
      ];
    });

  return rawCues
    .map((cue) => {
      const anchor = getCueAnchorFromDistance(bundle, cue.triggerDistanceM);
      return {
        ...cue,
        anchorLat: anchor.lat,
        anchorLon: anchor.lon,
      };
    })
    .sort((a, b) => a.triggerDistanceM - b.triggerDistanceM);
}

export function useNavigationBundle(navigationBundleUrl: string | null | undefined) {
  const [bundle, setBundle] = useState<NavigationBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!navigationBundleUrl) {
      setBundle(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);

    void fetch(navigationBundleUrl, {
      method: 'GET',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`navigation bundle fetch failed: ${res.status}`);
        }

        const json = (await res.json()) as NavigationBundle;
        setBundle(json);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setBundle(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [navigationBundleUrl]);

  const cues = useMemo(() => {
    if (!bundle) return [];
    return extractNavigationCues(bundle);
  }, [bundle]);

  return {
    bundle,
    cues,
    isLoading,
  };
}
