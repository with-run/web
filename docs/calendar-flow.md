# 캘린더 전체 흐름

> **이 문서는 현재 구현 상태 기준입니다.**

---

## 라우트 구조

```
/calendar              CalendarPage → CalendarScreen       ← 기록 목록 + 달력
/calendar/:id          CalendarDetailPage → CalendarDetailScreen  ← 러닝 기록 상세
```

---

## 컴포넌트 트리

```
CalendarPage
  └─ CalendarScreen                 ← useCalendar() 훅으로 모든 상태 관리
       ├─ StreakCard                 ← summaryData (연속 러닝 일수)
       ├─ ActivitySummary           ← 전체/월별 요약 (달력 상태에 따라 전환)
       ├─ [달력 토글 버튼]
       ├─ CalendarHeader            ← 연/월 표시 + 이전/다음 버튼
       ├─ CalendarGrid              ← 날짜 그리드 + 운동 기록 점 표시
       └─ RunningHistoryList        ← 무한스크롤 기록 목록
            └─ SessionCard          ← 개별 러닝 기록 카드 (클릭 시 상세 이동)

CalendarDetailPage
  ├─ useCalendarDetail()            ← 상세 API 호출
  └─ CalendarDetailScreen          ← 상세 화면 렌더링
       ├─ DetailMap                 ← GPS 경로 지도 (gpsSamples >= 2개일 때만)
       ├─ HeartRateSection          ← 심박수 변동 (healthSamples 있을 때만)
       └─ SplitsSection            ← 구간별 페이스 (splits 있을 때만)
```

---

## 1단계 — 캘린더 목록 화면 (`/calendar`)

### 데이터 흐름

```
CalendarScreen 마운트 (최초 진입)
  │
  ├─ [마운트 1회, 병렬] getCalendarSummaryApi()
  │    GET /calendars/{userId}/summary
  │    → setSummaryData (전체 누적 요약 + 스트릭)
  │
  ├─ [마운트 1회, 병렬] useInfiniteQuery(['runningHistory', {}])
  │    GET /running-sessions/history/past?userId=1
  │    → historyItems 1페이지 (캐시 없으면 새 요청)
  │    → isHistoryLoading = true → false
  │
  ├─ [달력 열릴 때 + 월 이동 시] getMonthlyCalendarApi(year, month)
  │    GET /calendars/{userId}?year=&month=
  │    → setMonthlyData (월별 요약 + 운동한 날짜 목록)
  │    + useInfiniteQuery(['runningHistory', { year, month }])
  │      → 해당 월 기록 조회 (캐시 없으면 새 요청)
  │
  ├─ [달력 닫힐 때] getCalendarSummaryApi() 재조회
  │    → 새 러닝 기록 반영
  │    + useInfiniteQuery(['runningHistory', {}]) 전체 기록으로 복귀
  │      → staleTime 이내면 캐시 즉시 반환, 지났으면 재요청
  │
  └─ [스크롤 하단 도달 시] fetchNextPage()
       GET /running-sessions/history/past?userId=1&cursor=...
       → 다음 페이지 items 누적 (pages.flatMap → historyItems)
       → hasMore = false 되면 더 이상 요청 안 함

CalendarScreen 마운트 (상세 페이지에서 돌아온 경우)
  │
  ├─ useInfiniteQuery(['runningHistory', historyParams])
  │    → staleTime(5분) 이내면 캐시 즉시 반환
  │    → isHistoryLoading = false (새 네트워크 요청 없음)
  │
  └─ useEffect([isHistoryLoading])
       → isHistoryLoading = false 확인
       → sessionStorage에 calendarScrollY 있으면 스크롤 위치 복원
       → 없으면 맨 위 유지
```

> **최초 진입 vs 상세에서 복귀 차이:**
> 두 경우 모두 CalendarScreen이 마운트되므로 `useEffect([], [])` 가 실행되어 summary API는 항상 재호출된다.
> past API만 다르다 — 최초 진입 시 새 요청, 상세에서 복귀 시 staleTime(5분) 이내면 캐시를 그대로 사용해 재요청하지 않는다.

### `useCalendar` 훅 — 상태 목록

| 상태 | 타입 | 초기값 | 역할 |
|---|---|---|---|
| `year` | number | 현재 연도 | 달력에 표시 중인 연도 |
| `month` | number | 현재 월 | 달력에 표시 중인 월 |
| `isCalendarOpen` | boolean | false | 달력 그리드 표시 여부 |
| `selectedDate` | string \| null | null | 클릭한 날짜 (`"2026-03-15"`) |
| `monthlyData` | MonthlyCalendarData \| null | null | 월별 캘린더 데이터 |
| `summaryData` | CalendarSummaryData \| null | null | 전체 누적 요약 |
| `isMonthlyLoading` | boolean | false | 월별 API 로딩 상태 |
| `isSummaryLoading` | boolean | false | 요약 API 로딩 상태 |

### `buildHistoryParams` — 컨텍스트별 API 파라미터 결정

```
isCalendarOpen = false  →  {}                              → 전체 기록
isCalendarOpen = true, selectedDate = null  →  { year, month }   → 월별 기록
isCalendarOpen = true, selectedDate = "2026-03-15"  →  { year: 2026, month: 3, day: 15 }  → 일별 기록
```

`queryKey: ['runningHistory', historyParams]`로 컨텍스트마다 캐시가 분리됨.

### 달력 상태에 따른 UI 분기

| 달력 상태 | selectedDate | ActivitySummary | 기록 리스트 제목 | 날짜 헤더 |
|---|---|---|---|---|
| 닫힘 | - | 전체 요약 (lifetime) | 전체 기록 | 표시 |
| 열림 | null | 월별 요약 (monthly) | `2026년 3월 활동` | 표시 |
| 열림 | `"2026-03-15"` | 월별 요약 (monthly) | `3월 15일 활동` | 숨김 |

### CalendarGrid — 날짜 셀 상태

```
각 날짜 셀은 4가지 상태를 가짐:
  isSelected  → 클릭된 날짜 (배경 채움)
  isToday     → 오늘 날짜 (테두리)
  isFuture    → 미래 날짜 (비활성화, 흐리게)
  isActive    → 운동 기록 있음 (빨간 점 표시)

activeDates: Set<string>
  ← monthlyData.dailySummaries.map(s => s.calendarDate)
  ← Set 사용 이유: activeDates.has("2026-03-15") — 배열 .includes()보다 빠름
```

### 월 이동

```
goPrev()  →  month - 1 (1월이면 year - 1, month = 12)
goNext()  →  isCurrentMonth이면 return (미래 막기)
             month + 1 (12월이면 year + 1, month = 1)
월 이동 시 setSelectedDate(null) → 날짜 선택 해제
```

---

## 2단계 — 상세 화면 (`/calendar/:id`)

### 진입 흐름

```
SessionCard 클릭
  │
  ├─ sessionStorage.setItem('calendarScrollY', scrollRef.current.scrollTop)
  │    ← 현재 스크롤 위치를 클릭 시점에 저장
  │
  └─ navigate('/calendar/${runningSessionId}')
       → CalendarDetailPage 마운트
            → useCalendarDetail(runningSessionId)
                 GET /running-sessions/{id}/detail/{userId}
                 → 로딩 중: 전체화면 "불러오는 중..."
                 → 에러: 전체화면 "기록을 불러올 수 없습니다."
                 → 성공: CalendarDetailScreen 렌더링
```

### `useCalendarDetail` 훅

```ts
useEffect(() => {
  let cancelled = false;
  getRunningSessionDetailApi(runningSessionId)
    .then(res => setDetail(res.data))
    .catch(() => setIsError(true))
    .finally(() => setIsLoading(false));
  return () => { cancelled = true; };
}, [runningSessionId]);
```

`cancelled` 플래그: `runningSessionId`가 바뀌거나 언마운트 시 이전 응답 무시 (race condition 방지).

### API 응답 타입 (`RunningSessionDetailResponse`)

```ts
{
  runningSessionId: number;
  startedAt: string;        // "2026-03-12T06:30:00"
  distanceM: number;
  durationSec: number;
  avgPaceSecPerKm: number;
  caloriesKcal: number;
  elevationGainM: number;
  gpsSamples: GpsSample[];       // GPS 경로 (지도 렌더용)
  healthSamples: HealthSample[]; // 심박수 데이터
  splits: SplitResult[];         // 구간별 페이스
}
```

### CalendarDetailScreen — 섹션별 표시 조건

| 섹션 | 표시 조건 |
|---|---|
| 지도 (DetailMap) | `gpsSamples.length >= 2` |
| 거리 / 시간 / 페이스 / 칼로리 / 고도 | 항상 표시 |
| 심박수 변동 (HeartRateSection) | `healthSamples`에서 `heartRate > 0`인 항목이 1개 이상 |
| 구간별 페이스 (SplitsSection) | `splits.length > 0` |

### SplitsSection — 부분 구간 처리

```
splits 배열의 각 항목:
  splitIndex      → 구간 번호 (1부터 시작)
  splitDistanceM  → 해당 구간의 실제 거리 (m)
  splitPaceSecPerKm → 해당 구간 페이스

표시:
  splitDistanceM < 1000  → "540m" (마지막 부분 구간)
  splitDistanceM >= 1000 → "1km", "2km", ...

상태 표시 (초록/노랑 점):
  splitPaceSecPerKm < 평균 → 초록 (평균보다 빠름)
  splitPaceSecPerKm >= 평균 → 노랑 (평균보다 느림)
```

### 닫기 버튼 동작

```
X 버튼 클릭
  → navigate('/calendar')
       → CalendarScreen 리마운트
            → TanStack Query 캐시에서 히스토리 즉시 복원 (staleTime: 5분)
            → isHistoryLoading = false
            → sessionStorage.getItem('calendarScrollY') 읽고 즉시 제거
            → scrollRef.current.scrollTop = 저장된 값 (스크롤 위치 복원)
```

---

## 스크롤 위치 복원 전체 흐름

```
[캘린더 목록에서 스크롤]
  CalendarScreen → scrollRef가 붙은 div 스크롤 중
  (별도 저장 없음)

[상세로 이동]
  SessionCard onClick
    → sessionStorage.setItem('calendarScrollY', scrollTop)  ← 클릭 시점에만 저장
    → navigate('/calendar/:id')

[상세에서 돌아옴]
  navigate('/calendar')
    → CalendarScreen 마운트
    → useInfiniteQuery: staleTime 이내면 캐시 즉시 반환 → isHistoryLoading = false
    → useEffect([isHistoryLoading]):
         saved = sessionStorage.getItem('calendarScrollY')
         sessionStorage.removeItem('calendarScrollY')   ← 소비 후 즉시 제거
         if (saved) → scrollRef.current.scrollTop = Number(saved)

[다른 페이지에서 돌아옴]
  navigate('/calendar')
    → CalendarScreen 마운트
    → sessionStorage에 'calendarScrollY' 없음 → 복원 안 함 (맨 위 유지)
```

> **왜 클릭 시점에만 저장하는가:**
> 스크롤마다 저장하면 다른 페이지에서 돌아와도 값이 남아있어 플래그가 별도로 필요하다.
> 클릭 시점에만 저장하면 'calendarScrollY'가 존재 = 상세에서 온 것이므로 플래그가 불필요하다.

---

## API 목록

| 메서드 | 경로 | 훅/호출처 | 용도 |
|---|---|---|---|
| GET | `/calendars/{userId}/summary` | `useCalendar` (마운트, 달력 닫힐 때) | 전체 누적 요약 + 스트릭 |
| GET | `/calendars/{userId}?year=&month=` | `useCalendar` (달력 열림 + 월 이동) | 월별 요약 + 운동한 날짜 목록 |
| GET | `/running-sessions/history/past` | `useCalendar` (useInfiniteQuery) | 러닝 기록 목록 (커서 페이지네이션) |
| GET | `/running-sessions/{id}/detail/{userId}` | `useCalendarDetail` | 러닝 기록 상세 |

---

## TanStack Query 사용 방식

히스토리 목록은 `useInfiniteQuery`로 관리:

```ts
useInfiniteQuery({
  queryKey: ['runningHistory', historyParams],  // 컨텍스트마다 캐시 분리
  queryFn: ({ pageParam }) => getRunningHistoryApi({ ...historyParams, cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  initialPageParam: undefined,
})
```

`staleTime: 5 * 60 * 1000` (5분, `main.tsx` 전역 설정):
- 상세에서 돌아왔을 때 5분 이내면 `isHistoryLoading = false`로 즉시 반환 → 스크롤 위치 복원 가능

`queryKey`에 `historyParams` 객체를 넣어 **전체/월별/일별** 컨텍스트마다 캐시가 분리됨.

### 캐시 저장 구조와 메모리 효율

TanStack Query는 응답 데이터를 JS 힙(메모리)에 보관함:

```
QueryCache (메모리)
└─ key: ['runningHistory', {}]
     pages: [
       { items: [...10개], hasMore: true,  nextCursor: "..." },
       { items: [...10개], hasMore: false, nextCursor: null  },
     ]
     updatedAt: 1711234567000   ← 마지막 fetch 시각
```

상세에서 돌아오면 이 메모리를 그대로 읽어 `historyItems`를 구성함 — 네트워크 요청 없음.

**메모리 관련 설정:**

| 설정 | 값 | 의미 |
|---|---|---|
| `staleTime` | 5분 | 이 시간 이내면 캐시를 fresh로 간주 → 재요청 안 함 |
| `gcTime` (구 cacheTime) | 기본 5분 | 구독자가 없어진 뒤 5분 후 메모리에서 자동 제거 |
| 캐시 키 수 | 컨텍스트마다 독립 | 전체/월별/일별 키가 동시에 메모리에 존재 가능 |

**무한스크롤과 메모리:**
스크롤을 많이 내릴수록 `pages` 배열에 데이터가 누적됨.
러닝 아이템 하나가 수십 바이트 수준이므로 실제 메모리 부담은 거의 없음.
필요 시 `maxPages` 옵션으로 캐시 유지 페이지 수를 제한할 수 있음:

```ts
useInfiniteQuery({
  ...
  maxPages: 3,  // 최근 3페이지만 캐시 유지 (앞 페이지 자동 제거)
})
```

현재는 스크롤 위치 복원 UX를 위해 모든 페이지를 유지하는 방식을 채택.

---

## `getRunningHistoryApi` — 과거 러닝 기록 조회 상세

### 엔드포인트

```
GET /running-sessions/history/past
```

### 쿼리 파라미터 (`GetRunningHistoryParams`)

```ts
type GetRunningHistoryParams = {
  year?:     number;  // 연도 필터 (month 없이 단독 사용 불가)
  month?:    number;  // 월 필터
  day?:      number;  // 일 필터 (year + month 필수)
  cursor?:   string;  // 커서 기반 페이지네이션 — 다음 페이지 시작점 (ISO 문자열 등)
  pageSize?: number;  // 한 번에 가져올 개수 (미전달 시 서버 기본값)
};
```

실제 요청 시 `userId`가 자동으로 추가됨:

```ts
// apis.ts
axiosClient.get('/running-sessions/history/past', {
  params: { userId: MOCK_USER_ID, ...params },
});
```

`MOCK_USER_ID = 1` 하드코딩 → 추후 auth context로 교체 예정.

### `buildHistoryParams` — 컨텍스트별 파라미터 결정

```
isCalendarOpen = false
  → {} (userId만 전달) → 전체 기록

isCalendarOpen = true, selectedDate = null
  → { year, month } → 해당 월 기록

isCalendarOpen = true, selectedDate = "2026-03-15"
  → { year: 2026, month: 3, day: 15 } → 해당 일 기록
```

`buildHistoryParams`의 반환값이 `historyParams`가 되고,
이것이 그대로 `queryKey: ['runningHistory', historyParams]`에 들어가서
컨텍스트마다 캐시가 독립적으로 관리됨.

### 응답 타입 (`GetRunningHistoryResponse`)

```ts
type GetRunningHistoryResponse = {
  items:      RunningHistoryItem[];  // 이번 페이지 기록 목록
  hasMore:    boolean;               // 다음 페이지 존재 여부
  nextCursor: string | null;         // 다음 페이지 커서 (hasMore=false면 null)
};
```

### `RunningHistoryItem` — 목록 아이템 필드

```ts
type RunningHistoryItem = {
  runningSessionId:   number;
  startedAt:          string;        // ISO 8601 ("2026-03-15T06:30:00")
  distanceM:          number;
  durationSec:        number | null; // null = 미완료 세션
  caloriesKcal:       number;
  snapshotImageUrl:   string | null; // GPS 경로 스냅샷 이미지 (없으면 null)
  elevationGainM:     number;
  isCompleted:        boolean;
  runningMode:        string;        // "FREE", "COURSE", "GHOST" 등
  ghostResultStatus:  string | null; // 고스트런 결과 (일반 러닝이면 null)
  timeSlot:           string;        // "DAWN" | "MORNING" | "AFTERNOON" | "EVENING"
};
```

`timeSlot`은 `RunningHistoryList`에서 한글로 변환:

```ts
const TIME_SLOT_LABEL: Record<string, string> = {
  DAWN: '새벽', MORNING: '오전', AFTERNOON: '오후', EVENING: '저녁',
};
```

### 커서 기반 페이지네이션 동작

```
1페이지 요청
  queryFn({ pageParam: undefined })
    → getRunningHistoryApi({ userId, ...historyParams })
    → 응답: { items: [...10개], hasMore: true, nextCursor: "2026-03-05T07:00:00" }

2페이지 요청 (무한스크롤 트리거)
  getNextPageParam(lastPage) → lastPage.nextCursor = "2026-03-05T07:00:00"
  queryFn({ pageParam: "2026-03-05T07:00:00" })
    → getRunningHistoryApi({ userId, ...historyParams, cursor: "2026-03-05T07:00:00" })
    → 응답: { items: [...10개], hasMore: false, nextCursor: null }

3페이지 요청
  getNextPageParam(lastPage) → undefined (hasMore=false)
  → fetchNextPage 호출 안 됨
```

### 페이지 데이터 평탄화

`useInfiniteQuery`는 응답을 `pages` 배열로 누적 저장:

```ts
historyPages.pages = [
  { items: [...1페이지], hasMore: true,  nextCursor: "..." },
  { items: [...2페이지], hasMore: false, nextCursor: null  },
]
```

`useCalendar`에서 `flatMap`으로 단일 배열로 평탄화:

```ts
const historyItems = historyPages?.pages.flatMap((p) => p.items) ?? [];
```

CalendarScreen → RunningHistoryList에는 이미 평탄화된 `historyItems`만 전달됨.

### 무한스크롤 트리거 (`useInfiniteScroll`)

`RunningHistoryList` 하단의 sentinel `<div>`에 `IntersectionObserver`를 연결:

```
sentinel이 뷰포트에 진입
  → hasMore && !isScrollLoading 조건 확인
  → onLoadMore() 호출 = fetchNextPage()
  → isFetchingNextPage = true (isScrollLoading)
  → 하단에 "불러오는 중..." 표시
  → 응답 도착 → pages 배열에 추가 → historyItems 재평탄화 → 목록 업데이트
```

### 컨텍스트 전환 시 동작

달력 상태가 바뀌면 `historyParams`가 달라져 `queryKey`가 변경됨:

```
달력 닫음 → queryKey: ['runningHistory', {}]
달력 열기 → queryKey: ['runningHistory', { year: 2026, month: 3 }]
  → 캐시 없으면 새 요청, 있으면 즉시 반환 (staleTime 이내)
날짜 선택 → queryKey: ['runningHistory', { year: 2026, month: 3, day: 15 }]
  → 별도 캐시 키 → 새 요청
같은 날짜 재클릭 → selectedDate = null
  → queryKey: ['runningHistory', { year: 2026, month: 3 }]
  → 월별 캐시 즉시 복원
```

각 컨텍스트의 캐시는 독립적으로 유지되어, 전환 시 이전 캐시가 즉시 표시됨.

---

## 미구현 / 개선 필요 항목

| 항목 | 현재 상태 |
|---|---|
| 인증 | `MOCK_USER_ID = 1` 하드코딩 → auth context 교체 필요 |
| SplitsSection | 백엔드가 1km 미만 구간 split을 내려줘야 표시됨 (프론트 로직은 준비됨) |

---

## 추후 리팩토링 고려 사항

### 데이터 페칭 방식 통일 (useEffect → useQuery)

현재 `useCalendar`는 데이터 페칭 방식이 두 가지로 혼재함:

```
summary, monthly  → useEffect + useState  (직접 관리)
history           → useInfiniteQuery      (TanStack Query)
```

summary와 monthly도 `useQuery`로 통일할 경우 장단점:

**장점**
- `isSummaryLoading`, `isMonthlyLoading` 등 로딩/에러 상태를 직접 `useState`로 관리할 필요 없음
- `cancelled` 플래그로 직접 막던 race condition이 TanStack Query 내부에서 자동 처리됨
- 같은 `queryKey`로 여러 컴포넌트가 동시에 마운트돼도 중복 요청이 자동으로 방지됨
- summary에 `staleTime` 설정 시 상세에서 돌아올 때 불필요한 재호출 제거 가능

**단점 (monthly)**

monthly는 `isCalendarOpen`일 때만 호출하는 조건부 로직이 있음:
```ts
// useQuery로 변경 시
useQuery({
  queryKey: ['monthlyCalendar', year, month],
  queryFn: () => getMonthlyCalendarApi(year, month),
  enabled: isCalendarOpen,  // 달력 열려있을 때만 실행
})
```
`enabled` 옵션으로 처리 가능하나, "달력 닫힐 때 summary 재조회"처럼 커스텀 타이밍이 필요한 로직은 `queryClient.invalidateQueries()`로 수동 무효화해야 함:
```ts
// 달력 닫힐 때 (현재 prevShowCalendarRef로 감지하던 부분)
queryClient.invalidateQueries({ queryKey: ['calendarSummary'] })
```

**결론**

| | 현재 | useQuery 통일 |
|---|---|---|
| 코드 일관성 | 방식이 섞임 | 통일됨 |
| 보일러플레이트 | 많음 (cancelled, setState 여러 개) | 적음 |
| monthly 조건부 호출 | useEffect 내 early return | `enabled` 옵션 |
| summary 재조회 타이밍 | `prevShowCalendarRef` 감지 | `invalidateQueries` 수동 호출 |
| 실제 동작 차이 | 없음 | 없음 |

summary는 바꾸면 보일러플레이트가 줄어 이득이 명확함.
monthly는 커스텀 타이밍 로직 때문에 바꿔도 복잡도가 크게 줄지 않아 현재 방식도 무방함.
