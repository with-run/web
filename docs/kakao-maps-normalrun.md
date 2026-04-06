# 카카오 지도 × NormalRun 구현 학습 노트

> **작업 배경:** NormalRunSessionScreen이 FreeRun feature의 `FreeRunMap`, `useFreeRunning`을 직접 import하는 교차 의존이 존재했다.
> NormalRun 전용 훅/컴포넌트를 새로 만들어 의존을 제거하고, 실제 GPS 기반 기능을 구현했다.

---

## 1. 카카오 지도 SDK 기초

### 1-1. SDK는 어떻게 로드되는가

카카오 지도 SDK는 `index.html`의 `<script>` 태그로 외부에서 불러온다.

```html
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"></script>
```

`autoload=false` 옵션을 주면 SDK 파일 자체는 다운로드되지만 **지도 엔진은 아직 초기화되지 않은 상태**다.
실제 초기화는 `kakao.maps.load(callback)` 을 호출했을 때 이루어진다.

```ts
kakao.maps.load(() => {
  // 이 콜백 안에서만 kakao.maps.Map, kakao.maps.LatLng 등 사용 가능
  const map = new kakao.maps.Map(container, options);
});
```

### 1-2. 왜 `kakao.maps.load()` 콜백 안에서만 API를 써야 하는가

`kakao.maps.load()`는 내부적으로 타일 서버, 렌더러 등 추가 리소스를 비동기로 더 받아온다.
콜백은 **모든 준비가 끝났을 때** 한 번 실행된다.
콜백 밖에서 `new kakao.maps.Map(...)` 을 바로 호출하면 클래스가 아직 정의되지 않아 에러가 난다.

```ts
// 잘못된 패턴
kakao.maps.load(() => { /* ... */ });
const map = new kakao.maps.Map(container, options); // 에러: Map is not a constructor
```

---

## 2. 카카오 지도와 React의 관계

### 2-1. Inversion of Control (제어의 역전)

React는 보통 **가상 DOM(Virtual DOM)**을 통해 실제 DOM을 관리한다.
하지만 카카오 지도를 쓸 때는 React에게 컨테이너 `<div>` 하나만 달라고 하고,
그 안쪽 DOM을 **카카오 SDK가 완전히 소유**한다.

```tsx
// React가 하는 일: 컨테이너 ref만 제공
function NormalRunMap({ coordinates }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useNormalRunMap(containerRef, { coordinates });

  return <div ref={containerRef} className="absolute inset-0 z-base" />;
  //     ↑ 이 div 안은 React가 건드리지 않는다
}
```

```ts
// SDK가 하는 일: 컨테이너를 넘겨받아 내부 DOM을 직접 생성
kakao.maps.load(() => {
  mapRef.current = new kakao.maps.Map(container, { center, level: 5 });
  //   ↑ 이 순간부터 container 내부 DOM 소유권이 Kakao SDK로 넘어감
});
```

이 패턴은 **Google Maps, Leaflet, Three.js** 등 외부 렌더러를 React와 함께 쓸 때 공통으로 나타난다.
"나는 그릇(div)만 줄게, 그 안을 어떻게 그릴지는 너가 결정해"라고 제어권을 역전시키는 것이다.

### 2-2. 카카오 지도는 canvas가 아닌 DOM 기반이다

카카오 지도의 타일 배경은 `<img>` 태그의 그리드로, 오버레이(마커, 폴리라인)는 `<div>` 또는 `<svg>`로 구성된다.
`<canvas>` 기반이 아니라는 점이 중요하다.

| 요소 | 실제 DOM 구조 |
|------|-------------|
| 지도 타일 | `<img>` 태그 격자 |
| 마커 / CustomOverlay | `<div>` |
| 폴리라인 | `<svg>` 또는 `<canvas>` (버전에 따라 다름) |

**Canvas 기반**이었다면 픽셀 단위로 직접 그려야 해서 React가 관여할 여지가 더 없었을 것이다.
DOM 기반이기 때문에 `CustomOverlay`의 `content`로 `HTMLElement`를 넘길 수 있다.

### 2-3. 훅 안에서 `document.createElement` 써도 되는가

```ts
function createUserDotContent(): HTMLElement {
  const dot = document.createElement('div');
  dot.style.cssText = `
    width: 16px;
    height: 16px;
    background: #3B82F6;
    border-radius: 50%;
  `;
  return dot;
}
```

React는 "React가 관리하는 DOM을 직접 건드리지 마라"라고 한다.
여기서 `document.createElement`로 만든 `div`는 **React의 Virtual DOM과 무관한 독립 노드**다.
이것을 카카오 SDK에 넘기면 SDK가 카카오 전용 DOM 트리 안에 배치한다 — React 트리 밖이다.

즉 **React가 관리하는 DOM에 직접 삽입하는 것이 아니므로 React 원칙을 위반하지 않는다.**

React에서 지양하는 패턴:
```ts
// 나쁜 예: React가 렌더링한 DOM을 직접 조작
document.getElementById('react-managed-div').style.color = 'red';
```

카카오 지도에서 쓰는 패턴:
```ts
// 좋은 예: Kakao SDK 전용 DOM을 위한 HTMLElement 생성
const el = document.createElement('div'); // React 트리와 무관
new kakao.maps.CustomOverlay({ content: el }); // SDK가 자기 DOM에 넣음
```

---

## 3. 구현된 파일 구조

```
hooks/NormalRun/
├── useNormalRunLocation.ts   GPS 소스 통합 (브릿지 우선, 브라우저 폴백)
├── useNormalRunDetailMap.ts  상세화면 지도 훅 (폴리라인 + 마커 + 근접 감지)
├── useNormalRunMap.ts        세션화면 지도 훅 (폴리라인 + 위치 도트)
└── useNormalRunning.ts       세션 통계 훅 (거리, 페이스, 칼로리 등)

features/NormalRun/
├── NormalRunMap.tsx          세션 지도 컴포넌트 (useNormalRunMap 래퍼)
├── NormalRunDetailScreen.tsx 상세화면 (useNormalRunDetailMap 사용)
└── NormalRunSessionScreen.tsx 세션화면 (NormalRunMap + useNormalRunning 사용)
```

---

## 4. GPS 통합 전략: `useNormalRunLocation`

**파일:** [hooks/NormalRun/useNormalRunLocation.ts](../src/hooks/NormalRun/useNormalRunLocation.ts)

```
데이터 우선순위:

모바일 앱(WebView)
  └─ Samsung Galaxy Watch → BLE → useBridgeDataStore.gpsLocation (정확도 높음)
  └─ 스마트폰 GPS → bridge postMessage → useBridgeDataStore.gpsLocation

웹 브라우저 (앱 없이 접속)
  └─ navigator.geolocation.watchPosition() (브라우저 내장 GPS)
```

```ts
export function useNormalRunLocation(): { location: GpsLocation | null } {
  const bridgeLocation = useBridgeDataStore((s) => s.gpsLocation);
  const [browserLocation, setBrowserLocation] = useState<GpsLocation | null>(null);

  useEffect(() => {
    if (bridgeLocation !== null) return; // 브릿지 GPS가 있으면 watchPosition 불필요

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => setBrowserLocation({ latitude: coords.latitude, ... }),
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId); // cleanup
  }, [bridgeLocation]);

  return { location: bridgeLocation ?? browserLocation };
  //                  ↑ null 병합: 브릿지가 있으면 브릿지 우선
}
```

**핵심 포인트:**
- `bridgeLocation`이 null이 아닌 순간 `watchPosition`은 시작하지 않는다 (조건부 실행)
- `bridgeLocation`이 null → non-null로 바뀌면 useEffect 재실행 → `return` 조기 탈출 + 이전 effect cleanup으로 watchPosition 중단
- unmount 시 `clearWatch()` cleanup이 항상 실행된다

---

## 5. 상세화면 지도 훅: `useNormalRunDetailMap`

**파일:** [hooks/NormalRun/useNormalRunDetailMap.ts](../src/hooks/NormalRun/useNormalRunDetailMap.ts)

이 훅 하나가 아래 기능 전부를 담당한다:

1. 카카오 지도 초기화
2. 코스 경로 폴리라인 렌더링
3. 출발/도착 마커
4. 사용자 현재 위치 도트
5. 코스 + 위치를 한 화면에 담는 bounds 조정
6. 출발 지점 근접 여부 감지 (`isNearStart`)

### 5-1. 단일 `kakao.maps.load()` 콜백 패턴

```ts
useEffect(() => {
  kakao.maps.load(() => {
    // ① 지도 생성
    mapRef.current = new kakao.maps.Map(container, { center, level: 5 });

    // ② 폴리라인
    const polyline = new kakao.maps.Polyline({ path, ... });
    polyline.setMap(mapRef.current);

    // ③ 출발 마커
    new kakao.maps.CustomOverlay({
      map: mapRef.current,
      position: startLatLng,
      content: createMarkerContent('출발', '#22C55E'),
    });

    // ④ 도착 마커
    new kakao.maps.CustomOverlay({ ... content: createMarkerContent('도착', '#EF4444') });

    // ⑤ 사용자 도트 (ref에 저장해서 나중에 위치 업데이트)
    userDotRef.current = new kakao.maps.CustomOverlay({ ... content: createUserDotContent() });
  });
}, [containerRef]); // 의존성: 컨테이너 ref만
```

**왜 하나의 콜백 안에 다 넣나?**
`kakao.maps.load()`가 비동기기 때문에 useEffect를 분리하면 타이밍이 보장되지 않는다.

```
시나리오 (잘못된 패턴):
useEffect A: kakao.maps.load(() => { mapRef.current = new Map(...) })
useEffect B: new CustomOverlay({ map: mapRef.current })  ← mapRef.current가 아직 null!
```

### 5-2. `useRef`로 SDK 인스턴스 관리하는 이유

```ts
const mapRef = useRef<kakao.maps.Map | null>(null);
const userDotRef = useRef<kakao.maps.CustomOverlay | null>(null);
```

`useState` 대신 `useRef`를 쓰는 이유:
- `useState`에 SDK 인스턴스를 넣으면 값이 바뀔 때마다 **리렌더링이 트리거**된다
- 지도 SDK 인스턴스가 바뀌는 게 아니라 SDK가 그 인스턴스를 통해 내부적으로 업데이트하므로 React에게 알릴 필요가 없다
- `useRef`는 값이 바뀌어도 리렌더링 없이 **최신 값을 항상 참조**할 수 있다

### 5-3. 위치 도트 업데이트: 두 번째 useEffect

```ts
useEffect(() => {
  if (!location || !mapRef.current || !userDotRef.current) return;

  const latLng = new kakao.maps.LatLng(location.latitude, location.longitude);

  // 도트 위치 업데이트
  userDotRef.current.setPosition(latLng);

  // 최초 GPS 수신 시: 코스 전체 + 사용자 위치가 한 화면에 보이도록 bounds 재조정
  if (!hasInitialBoundsRef.current && coursePathRef.current.length > 0) {
    const bounds = new kakao.maps.LatLngBounds();
    coursePathRef.current.forEach((p) => bounds.extend(p));
    bounds.extend(latLng); // 내 위치도 포함
    mapRef.current.setBounds(bounds);
    hasInitialBoundsRef.current = true; // 최초 1회만 실행
  }

  // 근접 감지
  const distM = haversineM(latitude, longitude, course.startLatitude, course.startLongitude);
  setIsNearStart(distM <= PROXIMITY_THRESHOLD_M); // 50m 이내면 true
}, [location, course.startLatitude, course.startLongitude]);
```

**두 useEffect를 분리하는 이유:**
첫 번째 useEffect는 지도 초기화(한 번만 실행), 두 번째는 위치 변화마다 실행.
의존성 배열이 다르기 때문에 분리해야 한다.

---

## 6. Haversine 공식

지구 표면의 두 좌표 사이 거리를 구하는 공식. GPS 근접 판정과 거리 누적에 사용한다.

```
지구를 구(球)로 가정했을 때:
두 점 (lat1, lon1), (lat2, lon2) 사이의 최단 경로(대원 호) 길이
```

```ts
// 미터 단위 (근접 감지용)
function haversineM(lat1, lon1, lat2, lon2): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// km 단위 (거리 누적용)
function haversineKm(...): number {
  const R = 6371; // 지구 반지름 (km)
  // ...공식 동일...
}
```

**GPS 노이즈 필터 (useNormalRunning.ts):**
```ts
// GPS 노이즈: 정지 중에도 좌표가 조금씩 흔들린다
// 2m 미만 → 제자리 노이즈 무시
// 50m 초과 → GPS 점프 (순간 오측위) 무시
if (delta > 0.002 && delta < 0.05) {
  setHaversineDistanceKm((prev) => prev + delta);
}
```

---

## 7. 세션 통계: `useNormalRunning`

**파일:** [hooks/NormalRun/useNormalRunning.ts](../src/hooks/NormalRun/useNormalRunning.ts)

### 7-1. 왜 `useNormalRunLocation`을 쓰지 않고 bridge store에 직접 접근하는가

세션 화면에서는 `NormalRunMap` (내부에 `useNormalRunMap`) 과 `useNormalRunning`이 동시에 실행된다.

```
NormalRunSessionScreen
├── NormalRunMap
│   └── useNormalRunMap
│       └── useNormalRunLocation  ← watchPosition 1개
└── useNormalRunning
    └── useNormalRunLocation  ← watchPosition 또 1개! (중복)
```

`useNormalRunLocation`을 두 곳에서 호출하면 `watchPosition`이 2개 동시 실행된다.
이를 방지하기 위해 `useNormalRunning`은 `useBridgeDataStore`를 직접 구독한다.

```ts
// useNormalRunning.ts
const gpsLocation = useBridgeDataStore((s) => s.gpsLocation); // 직접 구독
```

### 7-2. 워치/모바일 데이터 우선순위

```
거리 계산:
  워치 연결 중 + watchHealthData.distanceM > 0 → 워치 거리 우선 (더 정확)
  워치 미연결 또는 거리 0 → Haversine GPS 거리 폴백

칼로리, 심박수:
  워치 데이터 (`watchHealthData`) 우선, 없으면 0

케이던스 (걸음수):
  워치 연결 중 → 워치 케이던스 우선
  미연결 → GPS 케이던스 (가속도계)
```

### 7-3. 타이머 구현

```ts
const startTimeRef = useRef<number | null>(null);
const elapsedRef = useRef(0); // 일시정지 전까지 누적된 시간 (ms)

// 재개 시: 현재 타임스탬프 기록
startTimeRef.current = Date.now();

// tick마다: 누적 + 현재 세션 경과
setTime(Math.floor((elapsedRef.current + (Date.now() - startTimeRef.current)) / 1000));

// 일시정지 시: 현재 세션 경과를 누적에 더하고 타이머 멈춤
elapsedRef.current += Date.now() - startTimeRef.current;
startTimeRef.current = null;
```

---

## 8. 오버레이 스타일 가이드

모든 마커는 `kakao.maps.CustomOverlay`로 구현한다.
기본 `kakao.maps.Marker` 대신 CustomOverlay를 쓰는 이유: **완전한 스타일 자유도**.

```ts
new kakao.maps.CustomOverlay({
  map: mapRef.current,
  position: new kakao.maps.LatLng(lat, lng),
  content: htmlElement,    // HTMLElement 또는 HTML 문자열
  xAnchor: 0.5,            // 0.0~1.0: 가로 기준점 (0.5 = 중앙)
  yAnchor: 0.5,            // 0.0~1.0: 세로 기준점 (0.5 = 중앙)
  zIndex: 10,              // 레이어 우선순위
});
```

| 오버레이 | 색상 | 크기 | 용도 |
|---------|------|------|------|
| 출발 마커 | `#22C55E` (green-500) | 20px 원 + 라벨 | 코스 시작점 |
| 도착 마커 | `#EF4444` (red-500) | 20px 원 + 라벨 | 코스 끝점 |
| 사용자 위치 | `#3B82F6` (blue-500) | 16px 원 + halo | 실시간 현재 위치 |

---

## 9. 핵심 설계 결정 요약

| 결정 | 이유 |
|------|------|
| `useKakaoMap` shared hook 미사용 | `kakao.maps.load()` 비동기 타이밍 문제 — 마커 추가 시 지도가 아직 초기화 안 됨 |
| `useNormalRunning`이 bridge store 직접 구독 | `useNormalRunLocation` 중복 호출 시 `watchPosition` 2개 동시 실행 방지 |
| Haversine 훅별 로컬 선언 | 추후 `shared/utils`로 추출 예정 — 현재는 훅 로컬에 선언해 의존성 최소화 |
| `hasInitialBoundsRef`로 1회 bounds 설정 | 코스 + 사용자 위치를 첫 GPS 수신 시 한 화면에 담기 위해 — 이후는 `panTo`로만 추적 |
| `useRef`로 SDK 인스턴스 보관 | SDK 인스턴스 변경이 리렌더링을 트리거하면 지도가 재초기화되는 문제 방지 |

---

## 10. 관련 파일 목록

| 파일 | 역할 |
|------|------|
| [hooks/NormalRun/useNormalRunLocation.ts](../src/hooks/NormalRun/useNormalRunLocation.ts) | GPS 소스 통합 훅 |
| [hooks/NormalRun/useNormalRunDetailMap.ts](../src/hooks/NormalRun/useNormalRunDetailMap.ts) | 상세화면 지도 훅 |
| [hooks/NormalRun/useNormalRunMap.ts](../src/hooks/NormalRun/useNormalRunMap.ts) | 세션화면 지도 훅 |
| [hooks/NormalRun/useNormalRunning.ts](../src/hooks/NormalRun/useNormalRunning.ts) | 세션 통계 훅 |
| [features/NormalRun/NormalRunMap.tsx](../src/features/NormalRun/NormalRunMap.tsx) | 세션 지도 컴포넌트 |
| [features/NormalRun/NormalRunDetailScreen.tsx](../src/features/NormalRun/NormalRunDetailScreen.tsx) | 상세화면 |
| [features/NormalRun/NormalRunSessionScreen.tsx](../src/features/NormalRun/NormalRunSessionScreen.tsx) | 세션화면 |
| [pages/private/NormalRunSession.tsx](../src/pages/private/NormalRunSession.tsx) | 세션 페이지 (courseDetail 로딩) |
