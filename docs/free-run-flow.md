# 자유러닝 전체 흐름 (+ NormalRun 비교)

> **이 문서는 현재 구현 상태 기준입니다.**
> 이전 구현과 다른 부분이 많으므로 주의하세요.

---

## 변경 이력

| 항목 | 이전 | 현재 |
|---|---|---|
| **세션 ID 전달** | `navigate state` | `useFreeRunSessionStore` (Zustand) |
| **FreeRunSessionPage 데이터 소스** | `useLocation().state` | `useFreeRunSessionStore` |
| **스토어 구조** | `runningSessionId` 하나 | `session + result + clearAll` (NormalRun과 동일) |
| **페이즈 관리** | `FreeRunSessionPage` local state (`phase`, `result`) | `store.result !== null` 유무로 판단 |
| **FreeRunningScreen props** | `runningSessionId`, `onFinish` | 없음 (스토어에서 직접 읽음) |
| **FreeRunResultScreen props** | `result`, `courseId`, `runningSessionId`, `onCourseRegistered` | 없음 (스토어에서 직접 읽음) |
| **정상 완료 감지** | `completedRef.current = true` | `getState().result !== null` |
| **비정상 종료 cleanup** | `completedRef` + refs | `getState()` + `isRealUnmountRef + setTimeout` (StrictMode 수정) |
| **useFreeRunning() 데이터 수집** | 미구현 (배열 없음) | `getCollectedData()` 제공, GPS/헬스/splits 실제 수집 |
| **PATCH 요청 데이터** | `gpsSamples: []`, `healthSamples: []`, `splits: []` | `getCollectedData()` 실제 데이터 사용 |
| **비정상 종료 cleanup (StrictMode)** | `isRealUnmountRef + setTimeout(0)` | `import.meta.env.DEV` 시 cleanup 전체 skip |
| **중복 PATCH 방지** | `stopCalledRef` (handleStop 진입 시 flag 세팅) | `clearAll()` 후 `session=null` → `!s` 체크에서 자동 방지 |
| **FreeRunResultScreen props** | 없음 (스토어에서 직접 읽음) | `result: CompleteRunningSessionResponse` (non-nullable prop, NormalRun과 동일) |
| **FreeRunningScreen 네이밍** | `isSubmitting`, `latestGpsRef`, `handleStop`, `startSession` | `isEnding`, `latestGpsLocationRef`, `handleStopRunning`, `handleStartRunning` (NormalRun과 통일) |
| **비정상 종료 후 스토어 초기화** | cleanup에서 `clearAll` 미호출 | `ca()` (getState에서 꺼낸 clearAll) 호출 — NormalRun과 동일 |
| **RunCharacter props** | `isRunning: boolean` (세 상태 분기) | `disabled?: boolean` — 로딩 중 표시 전용 |

---

## 스토어 구조

### FreeRun: `stores/FreeRun/useFreeRunSessionStore`

```ts
interface FreeRunSessionStore {
  session: CreateRunningSessionResponse | null;  // POST 응답 (runningSessionId 포함)
  result: CompleteRunningSessionResponse | null; // PATCH 응답 (결과 화면에서 표시)
  setSession: (session) => void;
  setResult:  (result) => void;
  clearAll:   () => void;
}
```

### NormalRun: `stores/NormalRun/useNormalRunSessionStore`

```ts
interface NormalRunSessionStore {
  session: CreateRunningSessionResponse | null;
  result: CompleteRunningSessionResponse | null;
  setSession: (session) => void;
  setResult:  (result) => void;
  clearAll:   () => void;
}
```

> 타입과 구조가 동일하다. 스토어를 공유하지 않는 이유는 러닝 모드별 생명주기가 다르고,
> 추후 GhostRun 등 모드별 특수 필드가 추가될 수 있기 때문이다.

### CompleteRunningSessionResponse (PATCH 응답 공통 타입)

```ts
{
  runningSessionId, userId, snapshotImageUrl,
  startedAt, endedAt,
  distanceM, durationSec, avgSpeedMps, avgPaceSecPerKm, caloriesKcal, elevationGainM,
  gpsSamples, healthSamples, splits,
  ghostRunningResult: GhostRunningResult | null  // 자유러닝에서는 항상 null
}
```

---

## 라우트 구조 비교

```
FreeRun                              NormalRun
──────────────────────────────────   ──────────────────────────────────────────
/free-run        FreeRunPage         /normal-run              NormalRunPage
/free-run-session  FreeRunSessionPage  /normal-run/:courseId    NormalRunDetailPage
                                     /normal-run-session/:id  NormalRunSessionPage
```

- FreeRun은 **2단계** 라우트 (시작 화면 → 세션 화면)
- NormalRun은 **3단계** 라우트 (코스 목록 → 코스 상세 → 세션 화면)

---

## 1단계 — 시작 전 화면

### FreeRun: `/free-run` (FreeRunPage → FreeRunScreen)

```
FreeRunPage
  ├─ FreeRunScreen
  │    ├─ FreeRunMap          ← 카카오 지도 + 현재 위치 마커
  │    └─ RunCharacter        ← 클릭 시 세션 생성 + 이동
  └─ RunningGuideModal        ← 첫 방문 시만 표시 (localStorage)
```

**캐릭터 클릭 시 동작:**

```
클릭
  │
  ├─ Bridge GPS 있으면 → 즉시 POST
  └─ Bridge GPS 없으면 → navigator.geolocation.getCurrentPosition (timeout: 20s)
       ├─ 성공 → POST
       ├─ timeout (code 3) → 서울 기본 좌표(37.5665, 126.978)로 fallback → POST
       └─ 기타 실패 → 에러 메시지 (화면 내 표시, 재클릭으로 재시도 가능)
```

> **`calledRef` 가드:**
> Bridge GPS 없을 때 browser geolocation이 비동기로 진행되는 동안
> state 업데이트 전 중복 클릭을 막기 위한 동기 가드.
> NormalRun은 GPS 없으면 즉시 return하므로 불필요.

> **`isStarting` 상태:**
> 클릭 후 세션 생성 완료 전까지 `RunCharacter`에 `disabled` prop 전달 → "로딩중.." 표시.

**API:**

```
POST /running-sessions
  요청: { userId, mode: 'FREE', startLatitude, startLongitude }
  성공 → useFreeRunSessionStore.setSession(res.data)  ← session 전체 저장
       → navigate('/free-run-session')
  실패 → FreeRunScreen 내 에러 메시지 표시
```

---

### NormalRun: `/normal-run/:courseId` (NormalRunDetailPage → NormalRunDetailScreen)

```
NormalRunDetailPage
  └─ NormalRunDetailScreen
       ├─ NormalRunDetailMap  ← 코스 경로 표시 + 출발지 거리 안내
       └─ "시작" 버튼         ← 출발지 근처 도착 시 활성화
```

**시작 버튼 클릭 시 동작:**

```
클릭
  │
  ├─ Bridge GPS 없으면 → 즉시 return (아무 동작 없음)
  └─ Bridge GPS 있으면 → POST
       성공 → store.setSession(res.data)
            → navigate('/normal-run-session/:courseId')
```

**API:**

```
POST /running-sessions
  요청: { userId, mode: 'COURSE', courseId, startLatitude, startLongitude }
  성공 → useNormalRunSessionStore.setSession(res.data)
       → navigate
```

---

### 세션 생성 방식 비교

| | FreeRun | NormalRun |
|---|---|---|
| **생성 위치** | `FreeRunScreen` (시작 화면) | `NormalRunDetailScreen` (코스 상세 화면) |
| **GPS 폴백** | Bridge 없으면 browser geolocation | Bridge 없으면 시작 불가 |
| **스토어 저장** | `setSession(res.data)` | `setSession(res.data)` |
| **실패 처리** | 화면 내 에러 메시지 | 없음 (조용히 실패) |

> **FreeRun에 browser geolocation 폴백이 있는 이유:**
> FreeRun은 웹 브라우저에서도 테스트할 수 있어야 한다.
> NormalRun은 코스 출발지 근접 판단에 이미 Bridge GPS가 필수이므로 폴백이 의미 없다.

---

## 2단계 — 세션 페이지 진입

### FreeRun: `/free-run-session` (FreeRunSessionPage)

```
FreeRunSessionPage
  ├─ store.result === null  → FreeRunningScreen
  └─ store.result !== null  → FreeRunResultScreen
  └─ 언마운트 시 clearAll()  ← store 초기화
```

- 진입 시 별도 로딩 없음 — 세션은 이미 이전 화면에서 생성 완료
- 페이즈 local state 없음 — `store.result !== null` 유무로 화면 전환

---

### NormalRun: `/normal-run-session/:courseId` (NormalRunSessionPage)

```
NormalRunSessionPage
  ├─ useNormalRunCourseDetail(courseId)   ← 코스 상세 재조회 (지도 렌더에 필요)
  ├─ store.result === null → NormalRunSessionScreen
  └─ store.result !== null → NormalRunResultScreen
```

- 진입 시 코스 상세 API를 **다시 호출** (지도가 코스 경로를 표시하는 데 필요)

---

### 세션 페이지 구조 비교

| | FreeRun | NormalRun |
|---|---|---|
| **데이터 소스** | `useFreeRunSessionStore` | `useNormalRunSessionStore` |
| **화면 전환** | `store.result !== null` | `store.result !== null` |
| **진입 시 API 호출** | 없음 | 코스 상세 재조회 |
| **페이지 수** | 1개 (store 값으로 전환) | 1개 (store 값으로 전환) |

---

## 3단계 — 러닝 중

### 실시간 데이터 흐름 (공통)

```
네이티브 앱
  ├─ GPS 모듈   → gpsLocation   (1초마다)
  │    포함: latitude, longitude, altitude, speedMps, cadenceSpm, accuracy, heading
  └─ 워치 모듈  → watchHealthData (Samsung Health)
        포함: heartRate, caloriesKcal, cadenceSpm, distanceM
        ↓ Bridge (WebView postMessage)
  useBridgeDataStore (Zustand)
        ↓
  useFreeRunning() / useNormalRunning()
        ↓
  FreeRunningScreen / NormalRunSessionScreen
```

### useFreeRunning() 내부 구조

```
useFreeRunning()
  ├─ useRunningTimer()      ← 경과 시간 (durationSec, formattedTime, isPaused, togglePause)
  ├─ useRunningGps()        ← GPS 샘플 수집, Haversine 거리, 고도 누적
  │    gpsSamplesRef        ← GPS 샘플 배열 누적
  │    haversineDistanceKm  ← 워치 미연결 시 거리 폴백
  │    elevationGainMRef    ← 누적 고도 상승
  ├─ useRunningHealth()     ← 헬스 샘플 수집, 워치 연결 상태
  │    healthSamplesRef     ← 헬스 샘플 배열 누적
  │    isWatchConnected     ← 워치 연결 여부
  │    watchHealthData      ← 현재 워치 데이터
  └─ useRunningSplits()     ← 1km 구간 기록
       splitsRef            ← 구간 기록 배열
```

**데이터 우선순위:**
- 거리: 워치 연결 시 Samsung Health 기반 → 미연결 시 Haversine 폴백
- 칼로리/심박수/케이던스: 워치 우선 → 미연결 시 GPS 폴백

### FreeRunningScreen props

```
이전: <FreeRunningScreen runningSessionId={...} onFinish={...} />
현재: <FreeRunningScreen />  ← props 없음, 스토어에서 직접 읽음
```

- `session.runningSessionId` → `useFreeRunSessionStore.getState().session.runningSessionId`
- 종료 시 `onFinish(result)` 대신 `setResult(res.data)` → 스토어 업데이트 → 페이지가 자동 전환

> **[업데이트] NormalRun 네이밍 통일:**
> `isSubmitting` → `isEnding` / `latestGpsRef` → `latestGpsLocationRef` / `handleStop` → `handleStopRunning`

### 출력값 비교

| 출력값 | FreeRun (`useFreeRunning`) | NormalRun (`useNormalRunning`) |
|---|---|---|
| `time` | 문자열 `"MM:SS"` / `"HH:MM:SS"` | 초(number) |
| `distance` | 문자열 km `"1.23"` | 문자열 km `"1.23"` |
| `pace` | 문자열 `"5'30\""` | 문자열 `"5'30\""` |
| `calories` | number | number |
| `heartRate` | number (워치 기반) | number |
| `cadenceSpm` | number (워치/GPS) | number |
| `getCollectedData()` | **있음** — gpsSamples/healthSamples/splits 수집 | **있음** — gpsSamples/healthSamples/splits 수집 |

### 화면 구성 비교

| | FreeRun (`FreeRunningScreen`) | NormalRun (`NormalRunSessionScreen`) |
|---|---|---|
| **배경** | 단색 (`bg-secondary-foreground`) | 지도 위 오버레이 |
| **통계 위치** | 상단 카드 3개 | 상단 오버레이 (지도 위) |
| **타이머** | 중앙 크게 (포커스) | 하단 컨트롤 영역 |
| **PATCH 실패 처리** | `clearAll()` + navigate | `clearAll()` + navigate |
| **비정상 종료 처리** | `getState()` + StrictMode 수정 | `getState()` (StrictMode 수정 없음) |

---

## 4단계 — 종료 → PATCH

### FreeRun: `FreeRunningScreen.handleStopRunning()` + 비정상 종료

```
종료 버튼 (일시정지 상태에서만 표시)
  → handleStopRunning()
       ├─ getCollectedData()
       │    {
       │      durationSec, distanceM, avgSpeedMps, avgPaceSecPerKm,
       │      caloriesKcal, elevationGainM,
       │      gpsSamples,    ← 실제 수집 배열
       │      healthSamples, ← 실제 수집 배열
       │      splits,        ← 실제 수집 배열
       │    }
       │
       └─ PATCH /running-sessions/{runningSessionId}
            요청: {
              userId,
              ...getCollectedData(),
              endLatitude, endLongitude,  ← gpsLocation (없으면 0)
              distanceGapM: 0,            ← FreeRun은 코스 없으므로 항상 0
            }
            ├─ 성공 → store.setResult(res.data)
            │         → FreeRunSessionPage가 result !== null 감지 → FreeRunResultScreen으로 전환
            └─ 실패 → clearAll() + navigate('/free-run')  ← NormalRun과 동일

비정상 종료 (앱 이탈 / 뒤로가기)
  → useEffect cleanup (마운트 시 등록)
       ├─ import.meta.env.DEV 이면 즉시 return (개발 환경 전체 skip)
       └─ useFreeRunSessionStore.getState() 로 최신 session/result 확인
            ├─ result 있음 → skip (정상 완료 이미 처리됨)
            ├─ session 없음 → skip (handleStopRunning 에러 시 clearAll()로 null됨)
            └─ latestGetCollectedDataRef.current() 로 최신 수집 데이터 읽어 fire-and-forget PATCH
                 .catch(() => {}) — 실패해도 무시
                 ca() — clearAll (스토어 초기화)
```

> **`getState()` 패턴 이유:**
> useEffect cleanup 클로저는 마운트 시점의 값을 캡처한다.
> `useFreeRunSessionStore.getState()`를 사용하면 클로저 바깥에서 항상 최신 스토어 값을 읽을 수 있어
> `completedRef` 같은 별도 ref 없이도 완료 여부를 판단할 수 있다.

> **`latestGetCollectedDataRef` 패턴:**
> `getCollectedData`는 렌더마다 새로 생성되는 함수다.
> `latestGetCollectedDataRef.current = getCollectedData`를 매 렌더마다 갱신하면
> cleanup이 언마운트 직전의 최신 러닝 데이터를 읽을 수 있다.

> **StrictMode skip (`import.meta.env.DEV`) 이유:**
> React StrictMode(개발 환경)는 마운트 → 즉시 언마운트 → 리마운트 사이클을 반복한다.
> 이 가짜 언마운트에서 cleanup PATCH가 발사되면 durationSec=0으로 세션이 종료되는 버그가 발생한다.
> 비정상 종료 처리는 프로덕션 모바일에서만 필요하므로 DEV 환경은 전체 skip한다.
> (`import.meta.env.DEV`는 빌드 환경 기준 — `vite dev` 서버면 DEV, `vite build` 배포면 PROD)

> **중복 PATCH 방지 (`stopCalledRef` 제거):**
> 이전: `stopCalledRef`로 handleStopRunning 진입 여부를 별도 추적.
> 현재: handleStopRunning 에러 시 `clearAll()` 호출 → `session=null` → cleanup의 `!s` 체크에서 자동 방지.
> NormalRun과 동일한 패턴으로 단순화.

### NormalRun: `NormalRunSessionScreen.handleStopRunning()`

```
종료 버튼 (일시정지 상태에서만 표시)
  → handleStopRunning()
       ├─ getCollectedData()
       │    { gpsSamples, healthSamples, splits,
       │      distanceM, caloriesKcal, avgSpeedMps,
       │      durationSec, avgPaceSecPerKm, elevationGainM }
       │
       └─ PATCH /running-sessions/{session.runningSessionId}
            요청: {
              userId,
              endLatitude, endLongitude,
              distanceGapM: 0,
              ...getCollectedData()
            }
            ├─ 성공 → store.setResult(res.data) → 결과 화면으로 전환
            └─ 실패 → store.clearAll() → navigate('/normal-run')

비정상 종료 (앱 이탈 / 뒤로가기)
  → useEffect cleanup (마운트 시 등록)
       └─ useNormalRunSessionStore.getState() 로 최신 session/result 확인
            ├─ result 있음 → skip (정상 완료 이미 처리됨)
            ├─ session 없음 → skip (handleStopRunning 에러 시 clearAll()로 null됨)
            └─ latestGetCollectedDataRef.current() 로 최신 수집 데이터 읽어 fire-and-forget PATCH
                 .catch(() => {}) — 실패해도 무시
                 ca() — clearAll (스토어 초기화)
```

> NormalRun cleanup에는 `import.meta.env.DEV` skip이 없다.
> StrictMode 이중 마운트 시 cleanup이 발사될 수 있으나, 현재까지 문제 미발생.
> 추후 동일하게 패치 필요.

### PATCH 요청 비교

| | FreeRun | NormalRun |
|---|---|---|
| **gpsSamples** | 실제 수집 배열 | 실제 수집 배열 |
| **healthSamples** | 실제 수집 배열 | 실제 수집 배열 |
| **splits** | 실제 수집 배열 | 실제 수집 배열 |
| **distanceGapM** | `0` (코스 없음) | `0` |
| **완료 후 처리** | `store.setResult(res.data)` | `store.setResult(res.data)` |
| **실패 처리** | `store.clearAll()` + navigate | `store.clearAll()` + navigate |
| **비정상 종료 cleanup** | ✅ `import.meta.env.DEV` skip + `ca()` clearAll | ❌ StrictMode 수정 없음 |

---

## 5단계 — 결과 화면

### FreeRun: `FreeRunResultScreen`

- ~~props 없음 — `useFreeRunSessionStore`에서 `result` 직접 읽음~~
- **[업데이트]** `result: CompleteRunningSessionResponse` prop으로 받음 (non-nullable) — NormalRun과 동일
  - 부모(`FreeRunSessionPage`)가 `if (result)` 가드 후 렌더링
  - `result?.field ?? 0` 옵셔널 체이닝 불필요
- `runningSessionId` → `result.runningSessionId`
- `courseId` state → 컴포넌트 내부 local state (코스 등록 성공 후 비활성화용)

**섹션 구성:**

| 섹션 | 구현 상태 |
|---|---|
| 거리 (대형 표시) | 완료 |
| 시간 / 페이스 / 칼로리 | 완료 |
| 지도 (러닝 경로) | **미구현** (gpsSamples 수집은 완료, 지도 렌더링 미연결) |
| 심박수 (최소/평균/최대) | **mock** (healthSamples 수집은 완료, 결과 화면 연결 미완료) |
| 구간별 페이스 테이블 | **mock** (`useGeneratePaceData`로 생성, splits 연결 미완료) |
| 코스 등록 버튼 | 완료 → `CourseShareModal` |
| 홈으로 | 완료 → `/free-run` navigate |

### NormalRun: `NormalRunResultScreen`

- `useNormalRunSessionStore.result` (store에서 읽음)
- 실제 `healthSamples` 기반 심박수 표시
- 실제 `gpsSamples` 기반 경로 지도 표시 (`NormalRunResultMap`)
- 코스 등록 버튼 **없음** (이미 등록된 코스를 달렸으므로)

### 결과 화면 비교

| | FreeRun | NormalRun |
|---|---|---|
| **데이터 소스** | `result` prop (부모가 스토어에서 꺼내 전달) | `result` prop (부모가 스토어에서 꺼내 전달) |
| **props** | `result: CompleteRunningSessionResponse` | `result: CompleteRunningSessionResponse` |
| **지도** | 미구현 | 완료 (`NormalRunResultMap`) |
| **심박수** | mock | 실제 데이터 |
| **구간 페이스** | mock | 실제 데이터 |
| **코스 등록** | 있음 (`CourseShareModal`) | 없음 |

---

## 코스 등록 (`CourseShareModal`) — FreeRun 전용

```
"코스 등록" 버튼 클릭
  → CourseShareModal 열림
       │
       ├─ GET /meta/course/register  (useCourseSurveys)
       │    응답: GetCourseRegisterMetaResponse
       │      courseTypes: [{ data: "RIVERSIDE", label: "강변" }, ...]
       │      difficulties: [{ data: "EASY", label: "쉬움" }, ...]
       │      mode: [{ data: "COMMUNITY", label: "커뮤니티 코스" },
       │             { data: "PRIVATE",   label: "개인 코스" }]
       │
       └─ 등록 버튼 클릭
            → POST /running-sessions/{runningSessionId}/register-course
                 요청: { title, difficulty, courseTypes, mode }
                 성공 → setCourseId(courseId)  ← 컴포넌트 내부 state 업데이트
                      → 버튼 "등록 완료" 상태로 변경 (disabled)
```

> **왜 FreeRun에만 코스 등록이 있는가:**
> NormalRun은 기존 코스를 달리는 것이므로 새 코스 등록이 불필요하다.
> FreeRun은 경로가 없으므로 러닝 후 공식 코스로 남기고 싶은 경우에만 선택적으로 등록한다.

---

## 전체 흐름 요약 비교

```
FreeRun                                  NormalRun
──────────────────────────────────────   ──────────────────────────────────────
[시작 전]                                [코스 선택]
/free-run                                /normal-run
  지도 + 캐릭터 표시                         코스 목록 + 필터 표시
                                         ↓
                                         /normal-run/:courseId
                                           코스 상세 지도 + 정보 표시
                                           출발지 근접 시 시작 버튼 활성화

[세션 생성] ← 두 모드 모두 이 시점에서 POST
  GPS 확보 (FreeRun: Bridge or browser)  GPS 확보 (NormalRun: Bridge 필수)
  POST /running-sessions                 POST /running-sessions
    mode: 'FREE'                           mode: 'COURSE', courseId
  → store.setSession(res.data) 후 navigate  → store.setSession(res.data) 후 navigate

[러닝 중]
/free-run-session                        /normal-run-session/:courseId
  단색 배경                                카카오 지도 오버레이 (코스 경로 표시)
  useFreeRunning() — GPS/헬스/splits 수집  useNormalRunning() — GPS/헬스/splits 수집
  PATCH 성공: store.setResult(res.data)   PATCH 성공: store.setResult(res.data)
  PATCH 실패: clearAll() + navigate       PATCH 실패: clearAll() + navigate
  비정상 종료: getState() + DEV skip       비정상 종료: getState() (DEV skip 없음)

[결과]
  store.result에서 직접 읽음              store.result에서 직접 읽음
  gpsSamples/healthSamples: 수집 완료    gpsSamples/healthSamples: 실제 데이터
  결과 화면 연결: 미완료 (mock)           결과 화면 연결: 완료
  코스 등록 가능 (CourseShareModal)      코스 등록 없음
```

---

## 겹치는 부분 (공유 로직)

| 항목 | 공유 방식 |
|---|---|
| **세션 생성 API** | `createRunningSession()` — 동일 함수, `mode` 필드로 분기 |
| **세션 완료 API** | `completeRunningSession()` — 동일 함수 |
| **스토어 구조** | `session + result + clearAll` — 동일 인터페이스 |
| **Bridge 데이터** | `useBridgeDataStore` — 동일 store |
| **GPS/헬스/타이머/splits 수집** | `useRunningGps`, `useRunningHealth`, `useRunningTimer`, `useRunningSplits` — 공유 서브훅 |
| **일시정지/재개 UI** | 동일 패턴 (일시정지 시 종료 버튼 슬라이드) |

---

## 미구현 항목 (FreeRun)

### ~~러닝 중 데이터 수집~~ → 완료

`useFreeRunning()` 내부에서 `useRunningGps`, `useRunningHealth`, `useRunningSplits` 서브훅으로 수집 완료.

### ~~스토어 구조 통일~~ → 완료

`session + result + clearAll` 구조로 NormalRun과 통일 완료.

### 결과 화면 데이터 연결

수집은 완료됐지만 결과 화면(`FreeRunResultScreen`)에 아직 연결 안 된 항목:

- 지도에 러닝 경로 폴리라인 (`result.gpsSamples` → 지도 렌더링)
- 심박수 실제 데이터 (`result.healthSamples` → 최소/평균/최대 계산)
- 구간별 페이스 실제 데이터 (`result.splits` → 테이블 표시)

### 인증

`MOCK_USER_ID = 1` → auth context 실제 유저 ID 교체 필요
- `FreeRunScreen.tsx`
- `FreeRunningScreen.tsx`
