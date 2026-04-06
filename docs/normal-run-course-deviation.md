# NormalRun 코스 이탈 감지 & 안정권 복귀 시스템

## 개요

NormalRun 세션에서 사용자가 지정 코스에서 벗어났을 때 감지하고, 경고 후 10초 내 미복귀 시 세션을 강제 종료하는 기능이다.
이탈 및 일시정지 중에는 안정권(코스 기준 30m 이내)을 지도에 시각화하고, 일시정지는 안정권 내에서만 재개할 수 있도록 잠근다.

---

## 임계값

| 항목 | 값 | 근거 |
|------|-----|------|
| 이탈 감지 거리 | 30m | Strava·Komoot 기준, GPS 오차(5–15m) 감안 오탐 최소화 |
| 강제 종료 시간 | 10s | 이탈 지속 10초 |
| 안정권 반지름 | 30m | 이탈 감지 임계값과 동일 |

---

## 아키텍처

```
NormalRunSessionScreen
  └─ useNormalRunning (오케스트레이터)
       ├─ useNormalRunCourseDeviation  ← 이탈 감지 + deviationAnchor
       └─ pauseAnchor / isWithinPauseAnchor (인라인 로직)

NormalRunMap
  └─ useNormalRunMap  ← courseAnchor 기반 안정권 원 렌더링
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `web/src/shared/utils/geo.ts` | `pointToPolylineM`, `nearestPointOnPolyline` 지오 유틸 |
| `web/src/hooks/NormalRun/useNormalRunCourseDeviation.ts` | 이탈 감지 핵심 훅 |
| `web/src/hooks/NormalRun/useNormalRunning.ts` | 오케스트레이터, pauseAnchor 관리 |
| `web/src/hooks/NormalRun/useNormalRunMap.ts` | 지도에 안정권 원 표시 |
| `web/src/features/NormalRun/NormalRunMap.tsx` | 지도 컴포넌트 |
| `web/src/features/NormalRun/NormalRunSessionScreen.tsx` | 세션 화면, 재개 잠금 UI |
| `mobile/src/bridge/bridge.ts` | 진동 알림 구현 |
| `mobile/src/bridge/types.ts` | 브릿지 메서드 타입 |

---

## 이탈 감지 로직 (`useNormalRunCourseDeviation`)

### 상태 전환 규칙

| 조건 | 동작 |
|------|------|
| GPS 갱신 + 코스 거리 > 30m + `!isPaused` | `isDeviating = true`, `deviationAnchor` 고정 |
| GPS 갱신 + 코스 거리 ≤ 30m (언제든) | `isDeviating = false`, `deviationAnchor = null`, 복귀 토스트 |
| `isPaused` 중 GPS 갱신 + 거리 > 30m | **무시** (신규 이탈 진입 차단) |
| `isDeviating` false→true | `bridge.notifyCourseDeviation(1)` + 경고 토스트 |
| `deviationSec === 4` | `bridge.notifyCourseDeviation(2)` + 주의 토스트 |
| `deviationSec === 8` | `bridge.notifyCourseDeviation(3)` + 위험 토스트 |
| `deviationSec >= 10` | `bridge.notifyCourseDeviationForceStop()` + `onForceStop()` 호출 |

### deviationAnchor

- **설정 시점**: `isDeviating` false→true 전환 순간
- **값**: `nearestPointOnPolyline(현재GPS, 코스좌표)` — 코스 위 최근접 지점
- **고정**: 이탈 중 GPS가 변해도 앵커는 이동하지 않음
- **해제 시점**: `isDeviating` true→false (코스 복귀)

### `isPaused` 중 복귀 감지

`isPaused`이더라도 `isDeviating: true → false` 전환은 항상 동작 → 복귀 토스트 발송.
신규 이탈(`false → true`)은 `isPaused` 중 차단.

---

## 일시정지 재개 잠금 (`useNormalRunning`)

### pauseAnchor

- **설정 시점**: `isPaused` false→true 전환 순간
- **값**: `nearestPointOnPolyline(현재GPS, 코스좌표)` — 일시정지 시 코스 위 최근접 지점
- **고정**: 일시정지 중 GPS가 변해도 앵커 고정
- **해제 시점**: 재개(`isPaused` false)

### isWithinPauseAnchor

```ts
const isWithinPauseAnchor =
  !pauseAnchor || !gpsLocation ||
  haversineM(gpsLocation, pauseAnchor) <= 30;
```

- GPS 갱신마다 재계산 (반응형)
- `false` → 재개 버튼 비활성 + "안정권으로 복귀 후 재개 가능" 문구 표시

### 데이터 무결성

일시정지 지점 A에서 멈춘 뒤 다른 코스 지점 B에서 재개하면 A→B 구간 GPS/헬스 데이터가 유실된다.
재개 잠금은 이를 방지하기 위해 일시정지 지점(±30m) 내에서만 재개를 허용한다.

---

## 안정권 원 시각화 (`useNormalRunMap`)

### courseAnchor prop 흐름

```
useNormalRunCourseDeviation → deviationAnchor
useNormalRunning            → pauseAnchor
NormalRunSessionScreen      → courseAnchor = deviationAnchor ?? pauseAnchor
NormalRunMap                → courseAnchor prop
useNormalRunMap             → kakao.maps.Circle (radius: 30m)
```

### 원 스타일

| 속성 | 값 |
|------|----|
| 반지름 | 30m (DEVIATION_THRESHOLD_M과 동일) |
| 색상 | `#22c55e` (green-500) |
| 채우기 투명도 | 0.15 |
| 테두리 투명도 | 0.7 |

### 동작 규칙

- `courseAnchor !== null` → 앵커 좌표에 원 생성 (고정)
- `courseAnchor === null` → 원 제거
- 이탈 앵커(`deviationAnchor`)가 있으면 일시정지 앵커보다 우선 표시

---

## 모바일 브릿지 알림

### `notifyCourseDeviation(count: 1 | 2 | 3)`

진동 패턴: `[0, 300, 100, 300, 100, ...]` ms (300ms ON + 100ms 간격 × count)

| 호출 시점 | count |
|-----------|-------|
| 이탈 시작 (0s) | 1 |
| 이탈 4s | 2 |
| 이탈 8s | 3 |

### `notifyCourseDeviationForceStop()`

`Vibration.vibrate(1000)` — 1000ms 단일 진동, 강제 종료 시 호출.

---

## 토스트 메시지 목록

| 시점 | 타입 | 메시지 |
|------|------|--------|
| 이탈 시작 | `warning` | "코스를 이탈했습니다" + 10초 안내 |
| 이탈 4s | `error` | "코스 이탈 6초 남음" |
| 이탈 8s | `error` | "코스 이탈 2초 남음" |
| 강제 종료 | `error` | "코스를 이탈해 러닝을 종료합니다." |
| 코스 복귀 | `success` | "코스로 복귀했습니다" (일시정지 중 포함) |

---

## 데이터 수집 중단 조건

```ts
const shouldPauseCollection = isPaused || isDeviating;
```

이탈 중에는 `useRunningGps`, `useRunningHealth`, `useRunningSplits` 모두 수집을 중단한다.
코스 이탈 구간 데이터가 세션 결과에 포함되지 않도록 방지한다.

---

## 강제 종료 흐름

```
deviationSec >= 10
  → bridge.notifyCourseDeviationForceStop()
  → toast.error("코스를 이탈해 러닝을 종료합니다.")
  → latestOnForceStopRef.current()
      → forceStopRef.current()  (NormalRunSessionScreen)
          → handleStopRunning()
              → completeRunningSession() API 호출
              → setResult() → 결과 화면 이동
```

`forceStopRef` 패턴: `handleStopRunning`과 `onForceStop` 간 순환 의존을 해소하기 위해
`useRef<() => void>`를 중간 매개체로 사용하며, 매 렌더마다 최신 함수를 ref에 할당한다.
