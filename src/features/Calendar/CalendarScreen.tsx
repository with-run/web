import { ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useCalendar } from '@/hooks/Calendar';
import { cn, formatDateLabel } from '@/shared/utils';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { ActivitySummary } from './ActivitySummary';
import { RunningHistoryList } from './RunningHistoryList';
import { StreakCard } from './StreakCard';

const SCROLL_KEY = 'calendarScrollY';

export function CalendarScreen() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    year,
    month,
    monthlyData,
    isMonthlyLoading,
    summaryData,
    isSummaryLoading,
    historyData,
    isHistoryLoading,
    isScrollLoading,
    loadMore,
    selectedDate,
    toggleDate,
    activeDates,
    isCurrentMonth,
    goPrev,
    goNext,
    today,
    isCalendarOpen,
    setIsCalendarOpen,
  } = useCalendar();

  // 상세 페이지에서 돌아올 때만 스크롤 위치 복원
  // RunningHistoryList에서 상세로 이동 시 클릭 시점의 scrollTop을 저장
  // calendarScrollY가 있으면 상세에서 온 것 → 복원 후 제거
  // isHistoryLoading이 false가 되는 시점(= 데이터 준비 완료)에 1회만 실행
  
  // 복원 했는가에 대한 플래그
  const didRestoreRef = useRef(false);
  useEffect(() => {
    // 데이터 로딩 중이거나 이미 복원한 경우 아무 작업도 하지 않음
    if (isHistoryLoading || didRestoreRef.current) return;
    // 저장된 스크롤 위치 읽고 즉시 제거.
    // 다음번 캘릳너 진입 시 잘못 복원되는 걸 막기 위함
    const saved = sessionStorage.getItem(SCROLL_KEY);
    sessionStorage.removeItem(SCROLL_KEY);
    // 상세 페이지에서 온 경우 스크롤 위치 복원, 다른 곳에서 온 경우 맨 위 유지
    if (saved && scrollRef.current) {
      scrollRef.current.scrollTop = Number(saved);
    }
    // 복원 완료 표시
    // isHistoryLoading이 바뀔 때마다 실행되지만, didRestoreRef가 true가 되면
    // 두 번째부터는 바로 return
    didRestoreRef.current = true;
  }, [isHistoryLoading]);

  // 상단 요약 통계
  // - 달력 닫힘: "전체 요약" + lifetime 데이터
  // - 달력 열림: "월별 요약" + monthly 데이터
  const summaryLabel = isCalendarOpen ? '월별 요약' : '전체 요약';
  const summaryRunCount = isCalendarOpen
    ? (monthlyData?.monthlyRunCount ?? null)
    : (summaryData?.lifetimeRunCount ?? null);
  const summaryDistanceM = isCalendarOpen
    ? (monthlyData?.monthlyDistanceM ?? null)
    : (summaryData?.lifetimeDistanceM ?? null);

  // 러닝 기록 리스트 제목
  // - 날짜 선택됨: "3월 9일 활동" (달력 열릴 때만)
  // - 달력 열림 + 날짜 미선택: "2026년 3월 활동"
  // - 달력 닫힘 + 날짜 미선택: "전체 기록"
  const historyTitle = !isCalendarOpen
    ? '전체 기록'
    : selectedDate
      ? formatDateLabel(selectedDate)
      : `${year}년 ${month}월 활동`;

  return (
    <div ref={scrollRef} className="flex flex-col gap-4 h-full overflow-y-auto pb-6">
      {/* 화면 제목 */}
      <p className="h3-b text-fg-primary">활동 캘린더</p>

      {/* 연속 러닝 기록 (스트릭) - summary API에서 받아온 데이터 */}
      <StreakCard
        currentStreakDays={summaryData?.currentStreakDays ?? null}
        longestStreakDays={summaryData?.longestStreakDays ?? null}
        isLoading={isSummaryLoading}
      />

      {/* 요약 통계 (달력 상태에 따라 전체/월별 전환) */}
      <ActivitySummary
        label={summaryLabel}
        runCount={summaryRunCount}
        distanceM={summaryDistanceM}
        isLoading={isSummaryLoading}
      />

      {/* 달력 보기/숨기기 토글 */}
      <button
        type="button"
        onClick={() => {
          // selectedDate 유지 -> 달력 다시 열면 이전 선택 날짜 & RunningHistoryList(일별) 복원
          setIsCalendarOpen((prev) => !prev);
        }}
        className="w-full flex justify-between items-center p-3 rounded-xl border border-border-default bg-surface-default text-fg-primary hover:bg-surface-subtle transition-colors"
      >
        <span className="body-b">{isCalendarOpen ? '달력 숨기기' : '달력 보기'}</span>
        <ChevronDown
          size={20}
          className={cn('transition-transform duration-300', isCalendarOpen && 'rotate-180')}
        />
      </button>

      {/* 달력 - 둥근 박스에 담아 토글 */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          isCalendarOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="rounded-xl border border-border-default bg-surface-default p-4 flex flex-col gap-3">
            {/* < 20xx년 x월 > */}
            <CalendarHeader
              year={year}
              month={month}
              isCurrentMonth={isCurrentMonth}
              onPrev={goPrev}
              onNext={goNext}
            />
            {/* API 호출 중: 로딩 텍스트, 아니면 캘린더 그리드 표시 */}
            {/* API 응답 전에 CalendarGrid를 그리면 activeDates가 빈 Set */}
            {/* 빈 캘린더가 잠깐 보이는 현상 방지 */}
            {isMonthlyLoading ? (
              <div className="flex justify-center py-8">
                <span className="body-r text-fg-secondary">로딩 중...</span>
              </div>
            ) : (
              <CalendarGrid
                // 현재 보는 연(년)
                year={year}
                // 현재 보는 월
                month={month}
                // 운동한 날짜 Set (빨간 점 표시 여부)
                activeDates={activeDates}
                // 클릭한 날짜 or null값 (하이라이트 표시)
                selectedDate={selectedDate}
                // 오늘 날짜 표시 + 미래 날짜 비활성화
                today={today}
                // 날짜 클릭 핸들러 -> 같은 날짜 재클릭 시 선택 해제 → 월별 기록으로 복귀
                onSelectDate={toggleDate}
              />
            )}
          </div>
        </div>
      </div>

      {/* 러닝 기록 리스트 (항상 표시, 상태에 따라 전체/월별/일별 전환) */}
      <RunningHistoryList
        title={historyTitle}
        items={historyData?.items ?? []}
        isLoading={isHistoryLoading}
        // useCalendar에서 isScrollLoading, loadMore 받아
        // RunningHistoryList에 전달
        hasMore={historyData?.hasMore ?? false}
        isScrollLoading={isScrollLoading}
        // 날짜 미선택 상태(전체/월별)에서만 날짜 헤더 표시
        showDateHeader={!selectedDate}
        scrollRef={scrollRef}
        onLoadMore={loadMore}
      />
    </div>
  );
}
