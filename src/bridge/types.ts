// 웹-모바일 브릿지 공유 타입 (웹 자체 관리)
// 모바일 bridge.ts 변경 시 이 파일도 함께 업데이트해야 합니다.

// @webview-bridge/types 인라인 (외부 의존성 없이 타입만 정의)
type _OnlyJSON<T> = {
  [P in keyof T as T[P] extends string | number | boolean | null | undefined
    ? P
    : never]: T[P]
}
type _BridgeStore<T> = {
  getState: () => T
  setState: (newState: Partial<_OnlyJSON<T>>) => void
  subscribe: (listener: (newState: T, prevState: T) => void) => () => void
}

// ─── 공유 데이터 타입 ────────────────────────────────────────────

export type WatchHealthData = {
  timestamp: number
  heartRate: number
  caloriesKcal: number
  cadenceSpm: number   // Samsung Health SPM (모바일 가속도계보다 정확)
  distanceM: number    // 만보계 기반 누적 거리(m)
}

export type GpsLocation = {
  latitude: number
  longitude: number
  accuracy: number | null
  altitude: number | null
  heading: number | null
  speedMps: number | null    // GPS Doppler 직접 측정값 (가속도계 추정보다 정확)
  cadenceSpm: number | null  // 모바일 가속도계 기반 케이던스 (워치 SPM 대체)
}

export type VoiceCueKey =
  | 'start_01'
  | 'start_02'
  | 'direction_left_100m'
  | 'direction_left_70m'
  | 'direction_left_50m'
  | 'direction_left_30m'
  | 'direction_left_10m'
  | 'direction_right_100m'
  | 'direction_right_70m'
  | 'direction_right_50m'
  | 'direction_right_30m'
  | 'direction_right_10m'
  | 'heart_rate_high_01'
  | 'heart_rate_high_02'
  | 'heart_rate_very_high_01'
  | 'heart_rate_very_high_02'
  | 'off_course_01'
  | 'off_course_02'
  | 'stable_back_01'
  | 'stable_back_02'
  | 'turnaround_01'
  | 'turnaround_02'
  | 'destination_01'
  | 'destination_02'
  | 'end_01'
  | 'end_02'

export type WatchRunMode = 'FREE' | 'COURSE' | 'GHOST'

export type WatchLatLng = {
  latitude: number
  longitude: number
}

export type WatchRunStartPayload = {
  runningSessionId: number
  mode: WatchRunMode
  courseCoordinates: WatchLatLng[]
  ghostCoordinates: WatchLatLng[]
}

// ─── 브릿지 타입 (mobile bridge.ts와 동기화 필요) ────────────────

type _AppBridgeMethods = {
  whoRU(): Promise<string>
  startSocialLogin(url: string): Promise<void>
  notifyCourseDeviation(count: 1 | 2 | 3): Promise<void>
  notifyCourseDeviationForceStop(): Promise<void>
  playVoiceCue(key: VoiceCueKey): Promise<void>
  stopVoiceCue(): Promise<void>
  setVoiceEnabled(enabled: boolean): Promise<void>
  startWatchRunSync(payload: WatchRunStartPayload): Promise<void>
  stopWatchRunSync(): Promise<void>
}

// bridge() 반환 타입과 구조적으로 동일
export type AppBridge = _BridgeStore<_AppBridgeMethods>

// postMessageSchema() 반환 타입과 구조적으로 동일
export type AndroidPostMessageSchema = {
  watchMessage: { validate: (data: unknown) => { message: string } }
  gpsLocation: { validate: (data: unknown) => GpsLocation }
  watchHealthData: { validate: (data: unknown) => WatchHealthData }
}
