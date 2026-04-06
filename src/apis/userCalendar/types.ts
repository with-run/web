// GET /calendars/me/weekly - 이번 주 요약
export type WeeklyCalendarData = {
  weeklyRunCount: number;
  weeklyDistanceM: number;
  weeklyCaloriesKcal: number;
  weeklyDurationSec: number;
};

// GET /calendars/me/summary - 전체 기간 누적 요약 + 스트릭
export type CalendarSummaryData = {
  lifetimeRunCount: number;
  lifetimeDistanceM: number;
  lifetimeCourseRunCount: number;
  lifetimeFreeRunCount: number;
  lifetimeGhostRunCount: number;
  currentStreakDays: number;
  longestStreakDays: number;
  calculatedDate: string;
};

// GET /calendars/me 응답 - 날짜별 요약 항목
// 활동이 있는 날짜만 포함됨 (운동 기록 없는 날짜는 배열에 포함되지 않음)
export type DailyCalendarData = {
  calendarDate: string;
  dailyDistanceM: number;
  dailyDurationSec: number;
  dailyCaloriesKcal: number;
  dailyCourseRunCount: number;
  dailyFreeRunCount: number;
  dailyGhostRunCount: number;
};

// GET /calendars/me?year=&month= 응답
export type MonthlyCalendarData = {
  year: number;
  month: number;
  monthlyRunCount: number;
  monthlyDistanceM: number;
  monthlyCaloriesKcal: number;
  monthlyCourseRunCount: number;
  monthlyFreeRunCount: number;
  monthlyGhostRunCount: number;
  dailySummaries: DailyCalendarData[];
};
