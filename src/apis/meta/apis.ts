import axiosClient from '@/shared/libs/axiosClient';
import type { ApiResponse } from '../types';
import type {
  GetCourseSurveysResponse,
  GetCourseRegisterMetaResponse,
  GetNormalRunCourseFilterData,
} from './types';

/**
 * 설문 메타 항목 조회 API (GET /meta/survey)
 */
export const getCourseSurveysApi = async (): Promise<
  ApiResponse<GetCourseSurveysResponse>
> => {
  const { data } =
    await axiosClient.get<ApiResponse<GetCourseSurveysResponse>>(
      '/meta/survey'
    );
  return data;
};

/**
 * 코스 필터 항목 조회 API (GET /meta/course/filter/normal-run)
 */
export const getNormalRunCourseFilterApi = async (): Promise<
  ApiResponse<GetNormalRunCourseFilterData>
> => {
  const { data } = await axiosClient.get<
    ApiResponse<GetNormalRunCourseFilterData>
  >('/meta/course/filter/normal-run');
  return data;
};

/**
 * 코스 등록 메타 항목 조회 API (GET /meta/course/register)
 */
export const getCourseRegisterMetaApi = async (): Promise<
  ApiResponse<GetCourseRegisterMetaResponse>
> => {
  const { data } = await axiosClient.get<
    ApiResponse<GetCourseRegisterMetaResponse>
  >('/meta/course/register');
  return data;
};
