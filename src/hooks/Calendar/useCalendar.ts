import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  getMonthlyCalendarApi,
  getCalendarSummaryApi,
  type MonthlyCalendarData,
  type CalendarSummaryData,
} from '@/apis/userCalendar';
import {
  getRunningHistoryApi,
  type GetRunningHistoryParams,
} from '@/apis/runningSessions';

// 현재 컨텍스트(전체/월별/일별)에 맞는 history API 파라미터 생성
// useInfiniteQuery의 queryKey에 이 파라미터 객체를 넣어서 컨텍스트마다 캐시 분리
function buildHistoryParams(
  isCalendarOpen: boolean,
  year: number,
  month: number,
  selectedDate: string | null,
): GetRunningHistoryParams {
  // 1. 달력 닫힘 (전체 기록 조회)
  if (!isCalendarOpen) return {};
  // 2. 달력 열림 + 날짜 선택됨 (일별 기록 조회)
  if (selectedDate) {
    const [y, m, d] = selectedDate.split('-');
    return { year: Number(y), month: Number(m), day: Number(d) };
  }
  // 3. 달력 열림 + 날짜 선택 안됨 (월별 기록 조회)
  return { year, month };
}

export function useCalendar() {
  // 날짜 표시 방법
  // 1. 렌더링마다 새 Date 객체 생성 (현재 방식)
  // 캘린더 -> 홈 이동 -> (자정 경과) -> 캘린더 재진입 ->
  // CalendarScreen 언마운트 -> 리마운트 -> useCalendar 훅 처음부터 실행
  // new Date() = 자정 이후 날짜
  // 2. state + useEffect() => 화면 켜둔채로 있어도 setTimeout으로 갱신
  // (발생 가능성이 낮고, 오버엔지니어링)
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  // (0 ~ 11) + 1
  const [month, setMonth] = useState(today.getMonth() + 1);
  // 월별 캘린더 데이터 (달력 그리드용)
  // 1. 컴포넌트 마운트 -> monthlyData = null, 달력이 닫혀있으므로 API 호출 안 함
  // 2. 달력 열릴 때 -> getMonthlyCalendarApi 호출 -> 응답 오면 monthlyData = MonthlyCalendarData
  // 3. 월 이동 시 -> 새 API 호출 -> 응답 오면 setMonthlyData (새 데이터)
  const [monthlyData, setMonthlyData] = useState<MonthlyCalendarData | null>(null);
  // API 호출 중인지 아닌지를 나타내는 플래그
  // 초기값 false = 아직 로딩 중 아님
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  // 전체 기간 요약 (달력 닫힌 상태에서 ActivitySummary에 표시)
  const [summaryData, setSummaryData] = useState<CalendarSummaryData | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  // 선택한 날짜 (달력에서 클릭, 재클릭 시 해제)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 달력 그리드 표시 여부 (토글 버튼으로 제어)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  // 미래 달을 막기 위한 용도 (캘린더 헤더의 다음 버튼 비활성화)
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // 각 effect는 .then/.catch/.finally 체이닝 방식으로 작성

  // 마운트 시 1회: 전체 기간 요약 조회
  // 컴포넌트 마운트 -> getCalendarSummaryApi() 호출
  // -> 성공: setSummaryData(응답 데이터)
  // -> 실패: setSummaryData(null) (에러 메시지 대신 빈 화면)
  useEffect(() => {
    let cancelled = false;
    setIsSummaryLoading(true);
    getCalendarSummaryApi()
      .then((res) => { if (!cancelled) setSummaryData(res.data); })
      .catch(() => { if (!cancelled) setSummaryData(null); })
      .finally(() => { if (!cancelled) setIsSummaryLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // 달력이 닫힐 때 (true → false): summary 재조회
  // [isCalendarOpen] 의존성 배열 (달력 닫힐 때 재조회)
  const prevShowCalendarRef = useRef<boolean | null>(null);
  useEffect(() => {
    const wasOpen = prevShowCalendarRef.current === true;
    prevShowCalendarRef.current = isCalendarOpen;
    if (!wasOpen || isCalendarOpen) return;
    let cancelled = false;
    setIsSummaryLoading(true);
    getCalendarSummaryApi()
      .then((res) => { if (!cancelled) setSummaryData(res.data); })
      .catch(() => { if (!cancelled) setSummaryData(null); })
      .finally(() => { if (!cancelled) setIsSummaryLoading(false); });
    return () => { cancelled = true; };
  }, [isCalendarOpen]);

  // 달력이 열려있을 때 year/month 변경 시 월별 캘린더 데이터 조회
  // 달력이 닫혀있으면 skip (데이터 불필요)
  // [isCalendarOpen, year, month] 의존성 배열 (달력 열릴 때 + 월 이동 시 재조회)
  useEffect(() => {
    if (!isCalendarOpen) return;
    let cancelled = false;
    setIsMonthlyLoading(true);
    getMonthlyCalendarApi(year, month)
      .then((res) => { if (!cancelled) setMonthlyData(res.data); })
      .catch(() => { if (!cancelled) setMonthlyData(null); })
      .finally(() => { if (!cancelled) setIsMonthlyLoading(false); });
    return () => { cancelled = true; };
  }, [isCalendarOpen, year, month]);

  // 러닝 기록: useInfiniteQuery로 관리
  // - queryKey가 컨텍스트(전체/월별/일별)마다 달라서 자동으로 캐시 분리
  // - 돌아왔을 때 캐시된 데이터를 즉시 복원 (staleTime: 5분, main.tsx에서 전역 설정)
  const historyParams = buildHistoryParams(isCalendarOpen, year, month, selectedDate);
  const {
    data: historyPages,
    isLoading: isHistoryLoading,
    isFetchingNextPage: isScrollLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['runningHistory', historyParams],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const res = await getRunningHistoryApi(
        pageParam ? { ...historyParams, cursor: pageParam } : historyParams,
      );
      return res.data;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as string | undefined,
  });

  const historyItems = historyPages?.pages.flatMap((p) => p.items) ?? [];
  const hasMore = hasNextPage ?? false;

  function goPrev() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }

  // 미래 버튼 막기
  function goNext() {
    if (isCurrentMonth) return;
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }

  // 운동 기록이 있는 날짜 조회하기 위함 (운동한 날짜에 빨간 점이 찍힘)
  // 배열을 Set으로 반환
  // Set을 쓰는 이유: CalendarGrid에서 날짜 클릭마다 activeDates.has("2026-03-05")
  // 로 체크 - 배열의 .includes()보다 빠름
  const activeDates = new Set(
    monthlyData?.dailySummaries.map((s) => s.calendarDate) ?? [],
  );

  // 날짜 토글: 같은 날짜 재클릭 시 선택 해제 → 월별 기록으로 복귀
  function toggleDate(date: string) {
    setSelectedDate((prev) => (prev === date ? null : date));
  }

  return {
    year,
    month,
    monthlyData,
    isMonthlyLoading,
    summaryData,
    isSummaryLoading,
    historyData: { items: historyItems, hasMore },
    isHistoryLoading,
    isScrollLoading,
    loadMore: fetchNextPage,
    selectedDate,
    toggleDate,
    activeDates,
    isCurrentMonth,
    goPrev,
    goNext,
    today,
    isCalendarOpen,
    setIsCalendarOpen,
  };
}
