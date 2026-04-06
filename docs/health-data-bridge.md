# 헬스 데이터 브릿지 아키텍처

> 브랜치: `feat-watch/health-bridge`
> 워치 → 모바일 → 웹 간 실시간 헬스 데이터 전달 구조 및 이슈 정리

---

## 전체 데이터 흐름

```
[워치 (Galaxy Watch / Samsung Health)]
  ExerciseService (LifecycleService)
    └─ Health Services ExerciseClient
         ├─ HEART_RATE_BPM       (PPG + 모션보정)
         ├─ CALORIES_TOTAL       (HR 기반 누적)
         ├─ STEPS_PER_MINUTE     (만보계 케이던스 SPM)
         └─ DISTANCE_TOTAL       (만보계 누적 거리)
    └─ Wearable.MessageClient.sendMessage("/health-data", JSON)
         │  1초 주기 전송
         ▼
[모바일 (Expo / React Native)]
  WatchListenerService (WearableListenerService)  ← 백그라운드 수신
  WatchBridgeModule (ReactContextBaseJavaModule)  ← 포그라운드 수신
    └─ NativeEventEmitter.emit("WatchMessage", JSON)
         └─ useWatchBridge() hook
              └─ postMessage('watchHealthData', parsed)
  ┌──────────────────────────────────────────────┐
  │ 모바일 자체 수집                              │
  │  useGpsLocation (expo-location, 1초)         │
  │    latitude / longitude / accuracy           │
  │    altitude / heading / speedMps (Doppler)   │
  │  useCadence (expo-sensors Accelerometer)     │
  │    50Hz 샘플링 → rising-edge 피크 검출 → SPM │
  └──────────────────────────────────────────────┘
    └─ postMessage('gpsLocation', { ...gps, cadenceSpm })
         │
         ▼
[웹 (React / Vite)]
  bridge.addEventListener('watchHealthData') → useBridgeDataStore
  bridge.addEventListener('gpsLocation')     → useBridgeDataStore
    └─ useFreeRunning() — 데이터 우선순위 적용 후 UI에 노출
```

---

## 데이터 우선순위 (워치 vs 모바일 폴백)

| 지표 | 워치 연결 시 | 워치 미연결/끊김 시 |
|------|-------------|-------------------|
| 심박수 | 워치 Samsung Health PPG | **측정 불가** (모바일 대체 없음) |
| 칼로리 | 워치 HR 기반 누적값 | **측정 불가** |
| 케이던스 | 워치 만보계 SPM | 모바일 가속도계 (useCadence) |
| 거리 | 워치 만보계 누적 거리 | 모바일 GPS Haversine 누적 |
| 속도 | 모바일 GPS Doppler | 모바일 GPS Doppler (공통) |
| 위치(위/경도) | 모바일 GPS | 모바일 GPS (공통) |

> **워치 연결 판단 기준**: `lastWatchMessageAt` 기준 3초(`WATCH_TIMEOUT_MS`) 이상 메시지 없으면 끊김으로 판단 (1초마다 체크)

---

## 각 레이어 상세

### 1. 워치 (Kotlin / Wear OS)

**핵심 파일**: `watch/app/src/main/java/com/mobile/watch/ExerciseService.kt`

#### 측정 방식
- `ExerciseClient` (Samsung Health Services) 기반 운동 세션
- `ExerciseType.RUNNING`, GPS 비활성화 (GPS는 모바일에 위임)
- 수집 타입: `HEART_RATE_BPM`, `CALORIES_TOTAL`, `STEPS_PER_MINUTE`, `DISTANCE_TOTAL`

#### 전송
- 1초 주기 send loop (`startSendLoop`)
- `Wearable.MessageClient.sendMessage(nodeId, "/health-data", jsonBytes)`
- 데이터가 2초 이상 stale이면 전송 스킵 (노이즈 방지)

#### AOD/절전 대응
- `WindowManager.FLAG_KEEP_SCREEN_ON` 으로 측정 중 워치페이스 전환 차단
- `PowerManager.PARTIAL_WAKE_LOCK` (`WithRun:ExerciseWakeLock`) 으로 CPU 유지
- `AmbientLifecycleObserver` 로 AOD 진입/복귀 이벤트 감지
- `START_STICKY` 서비스 → OS가 강제 종료해도 자동 재시작
- 배터리 최적화 예외 등록 요청 (`Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)

#### 자동 재시작 로직
Samsung Health가 운동 세션을 강제 종료(`isEnded`)할 경우:
- `SharedPreferences`로 사용자 의도 종료 여부 구분
- 지수 백오프: 1회=즉시, 2회=5초, 3회=15초, 4회 이상=60초
- `AtomicBoolean`으로 중복 재시작 방지 (isEnded가 연속 다수 발사됨)
- 30초 안정 유지 시 재시작 카운터 초기화

---

### 2. 모바일 Native (Kotlin / Android)

**핵심 파일**: `mobile/android/app/src/main/java/com/mobile/WatchBridgeModule.kt`

#### 수신 이중화
| 수신 경로 | 담당 클래스 | 동작 조건 |
|-----------|------------|----------|
| 포그라운드 | `WatchBridgeModule` (MessageClient 직접 리스너) | 앱 활성화 중 |
| 백그라운드 | `WatchListenerService` (WearableListenerService, path: `/health-data`) | 앱 백그라운드 |

#### 백그라운드 큐 처리
- 백그라운드 수신 시 JS 브릿지 미준비 → `ConcurrentLinkedQueue<String>` (최대 120개 ≈ 2분치) 에 저장
- JS 브릿지 초기화(`initialize()`) 완료 후 큐 일괄 플러시 (`flushPendingMessages`)

---

### 3. 모바일 JS (React Native / Expo)

**핵심 파일**: `mobile/src/screens/webview/WebViewScreen.tsx`

#### 브릿지 스키마 (`mobile/src/bridge/bridge.ts`)
```
postMessageSchema:
  watchHealthData → WatchHealthData 타입
  gpsLocation     → GpsLocation 타입 (cadenceSpm 포함)
  watchMessage    → { message: string }
```

#### 케이던스 합산 방식
GPS 이벤트와 케이던스 이벤트의 주기가 달라 직접 합산 불가.
→ `cadenceSpmRef`(useRef)에 최신 SPM 값을 저장, GPS 이벤트 발생 시 ref 값을 `gpsLocation`에 합산하여 전송.

```
useCadence → cadenceSpmRef.current = spm
useGpsLocation → postMessage('gpsLocation', { ...location, cadenceSpm: cadenceSpmRef.current })
```

#### 타입 공유 (`mobile/src/bridge/types.ts`)
웹과 모바일이 동일한 타입 파일을 공유 (웹은 `@bridge` alias로 import):

```typescript
type WatchHealthData = {
  timestamp: number
  heartRate: number
  caloriesKcal: number
  cadenceSpm: number   // Samsung Health SPM
  distanceM: number    // 만보계 누적 거리
}

type GpsLocation = {
  latitude: number; longitude: number
  accuracy: number | null; altitude: number | null
  heading: number | null; speedMps: number | null  // GPS Doppler
  cadenceSpm: number | null  // 모바일 가속도계 폴백
}
```

---

### 4. 웹 (React / Vite)

**핵심 파일**: `web/src/hooks/FreeRun/useFreeRunning.ts`

#### 스토어 구조
```
useBridgeDataStore (zustand)
  ├─ gpsLocation: GpsLocation | null
  ├─ watchHealthData: WatchHealthData | null
  └─ lastWatchMessageAt: number | null  ← 워치 연결 상태 판단용
```

`useBridgeSync()` 훅을 앱 루트에서 한 번 호출해 브릿지 이벤트를 스토어에 자동 동기화.

#### 우선순위 적용 로직 (`useFreeRunning`)

```typescript
// 워치 연결 상태 (1초마다 체크)
const isWatchConnected = lastWatchMessageAt !== null
  && Date.now() - lastWatchMessageAt < 3000

// 케이던스: 워치 SPM 우선 → 모바일 가속도계 폴백
const cadenceSpm = isWatchConnected
  ? (watchHealthData?.cadenceSpm ?? gpsLocation?.cadenceSpm ?? 0)
  : (gpsLocation?.cadenceSpm ?? 0)

// 거리: 워치 만보계 우선 → Haversine(GPS) 폴백
const distanceKm = isWatchConnected && watchHealthData?.distanceM > 0
  ? watchHealthData.distanceM / 1000
  : haversineDistanceKm

// 속도: 항상 모바일 GPS Doppler (워치/모바일 공통)
const speedMps = gpsLocation?.speedMps ?? 0
```

---

## 발생한 주요 이슈

### Issue 1. 워치 화면 꺼짐 시 측정 서비스 종료
**현상**: 워치 화면이 꺼지면(15초 타임아웃) ExerciseService가 함께 종료됨
**원인**: Wear OS가 화면 OFF 시 포그라운드 서비스를 스로틀링
**해결**: `WindowManager.FLAG_KEEP_SCREEN_ON` 추가 + `PARTIAL_WAKE_LOCK` 획득

### Issue 2. AOD(Always-On Display) 전환 시 서비스 중단
**현상**: AOD 화면 진입 시 ExerciseService 콜백 지연 또는 중단
**원인**: AOD 전환 시 OS의 CPU 제한 적용
**해결**: `AmbientLifecycleObserver` 등록 + WakeLock 유지 + `START_STICKY`

### Issue 3. Samsung Health가 운동 세션 강제 종료
**현상**: 비활동 감지, 배터리 절약 정책 등으로 `isEnded` 콜백이 반복 발사됨
**원인**: Samsung Health의 세션 자동 관리
**해결**: 지수 백오프 재시작 + `AtomicBoolean`으로 중복 방지 + `SharedPreferences`로 의도 구분

### Issue 4. 백그라운드 수신 메시지 유실
**현상**: 앱 백그라운드에서 워치 메시지 수신 시 JS로 전달 불가
**원인**: ReactContext(JS 브릿지)가 백그라운드에서 미초기화 상태
**해결**: `WatchListenerService`에서 수신 → `pendingMessages` 큐에 저장 → 앱 포그라운드 복귀 후 플러시

### Issue 5. WatchBridgeModule 람다 캡처 컴파일 오류
**현상**: `WatchBridgeModule`에서 `reactContext` 람다 캡처 컴파일 실패
**원인**: 생성자 파라미터를 람다에서 직접 캡처할 때 코틀린 컴파일 오류
**해결**: `reactContext`를 `private val`로 명시 선언

### Issue 6. Wearable Data Layer 인증서 불일치
**현상**: 워치 전송 성공 로그가 찍혀도 모바일에서 수신 없음
**원인**: 폰 앱(Expo debug.keystore)과 워치 앱(~/.android/debug.keystore) 서명 불일치
**해결**: `watch/app/build.gradle`의 `signingConfigs.debug`를 Expo keystore 경로로 설정
→ 상세 내용: [watch_bridge_troubleshooting.md](./watch_bridge_troubleshooting.md)

---

## 관련 파일 목록

| 레이어 | 파일 | 역할 |
|--------|------|------|
| Watch | `watch/app/src/main/java/com/mobile/watch/ExerciseService.kt` | Samsung Health 데이터 수집 + 모바일 전송 |
| Watch | `watch/app/src/main/java/com/mobile/watch/MainActivity.kt` | AOD 관리, 서비스 시작/종료 |
| Mobile Native | `mobile/android/app/src/main/java/com/mobile/WatchBridgeModule.kt` | 워치 메시지 수신 → JS emit |
| Mobile Native | `mobile/android/app/src/main/java/com/mobile/WatchListenerService.kt` | 백그라운드 워치 메시지 수신 |
| Mobile JS | `mobile/src/bridge/bridge.ts` | 웹-모바일 브릿지 스키마 정의 |
| Mobile JS | `mobile/src/bridge/types.ts` | 공유 타입 (웹과 동기화 필요) |
| Mobile JS | `mobile/src/bridge/hooks/useWatchBridge.ts` | 워치 메시지 이벤트 구독 |
| Mobile JS | `mobile/src/bridge/hooks/useGpsLocation.ts` | GPS 구독 |
| Mobile JS | `mobile/src/bridge/hooks/useCadence.ts` | 가속도계 케이던스 계산 |
| Mobile JS | `mobile/src/screens/webview/WebViewScreen.tsx` | 모든 데이터 수집 → postMessage |
| Web | `web/src/bridge/stores/useBridgeDataStore.ts` | 브릿지 데이터 글로벌 스토어 |
| Web | `web/src/bridge/hooks/useBridgeSync.ts` | 브릿지 이벤트 → 스토어 동기화 |
| Web | `web/src/bridge/hooks/useWatchMessage.ts` | 워치 데이터 셀렉터 훅 |
| Web | `web/src/hooks/FreeRun/useFreeRunning.ts` | 우선순위 적용 후 UI 데이터 제공 |
