import type { VoiceCueKey } from '@bridge';

export type NavigationBundleShapePoint = {
  lat: number;
  lon: number;
  elevationM?: number;
};

export type NavigationBundleManeuver = {
  type: string;
  instruction?: string | null;
  cumulativeDistanceMeters?: number | null;
  deltaDegrees?: number | null;
  shapeIndex?: number | null;
};

export type NavigationBundleSegment = {
  startShapeIndex: number;
  endShapeIndex: number;
  startCumulativeDistanceMeters: number;
  endCumulativeDistanceMeters: number;
};

export type NavigationBundle = {
  schemaVersion?: string;
  totalDistanceMeters?: number;
  shape?: NavigationBundleShapePoint[];
  segments?: NavigationBundleSegment[];
  maneuvers?: NavigationBundleManeuver[];
};

export type NavigationCue = {
  id: string;
  triggerDistanceM: number;
  key: VoiceCueKey;
  anchorLat: number | null;
  anchorLon: number | null;
  radiusM: number;
};
