import axiosClient from '@/shared/libs/axiosClient';
import type { ApiResponse } from '../types';
import type {
  CalendarSummaryData,
  MonthlyCalendarData,
  WeeklyCalendarData,
} from './types';

/**
 * 이번 주 요약 조회
 * GET /calendars/me/weekly
 */
export const getWeeklyCalendarApi = async (): Promise<
  ApiResponse<WeeklyCalendarData>
> => {
  const { data } = await axiosClient.get<ApiResponse<WeeklyCalendarData>>(
    '/calendars/me/weekly'
  );
  return data;
};

/**
 * 전체 기간 누적 요약 + 스트릭 조회
 * GET /calendars/me/summary
 */
export const getCalendarSummaryApi = async (): Promise<
  ApiResponse<CalendarSummaryData>
> => {
  const { data } = await axiosClient.get<ApiResponse<CalendarSummaryData>>(
    '/calendars/me/summary'
  );
  return data;
};

/**
 * 월별 캘린더 데이터 조회
 * GET /calendars/me?year=&month=
 */
export const getMonthlyCalendarApi = async (
  year: number,
  month: number
): Promise<ApiResponse<MonthlyCalendarData>> => {
  const { data } = await axiosClient.get<ApiResponse<MonthlyCalendarData>>(
    '/calendars/me',
    { params: { year, month } }
  );
  return data;
};
