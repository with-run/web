// 메타 공통 선택지 옵션
export type MetaOption = {
  data: string;
  label: string;
};

// GET /meta/survey 응답
export type GetCourseSurveysResponse = {
  courseTypes: MetaOption[];
  difficulties: MetaOption[];
};

// GET /meta/course/filter/normal-run 응답
export type GetNormalRunCourseFilterData = {
  courseDistanceTypes: MetaOption[];
  courseTypes: MetaOption[];
  difficulties: MetaOption[];
};

// GET /meta/course/register 응답
export type GetCourseRegisterMetaResponse = {
  courseTypes: MetaOption[];
  mode: MetaOption[];
  routeTypes: MetaOption[];
  difficulties: MetaOption[];
};
