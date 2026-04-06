export const ONBOARDING_STORAGE_KEY = 'withrun:onboarding-complete';

export const ONBOARDING_INTRO_DURATION_MS = 1400;

export const ONBOARDING_LOGIN_COPY_TEXTS = [
  '오늘도 나를 위해, 가볍게 뛰어볼까요?',
  '당신의 페이스에 맞춘 완벽한 러닝 메이트',
  '혼자 뛰어도 외롭지 않게',
] as const;

export const ONBOARDING_STEPS = [
  // 질문 순서를 한 배열로 모아두면 온보딩 단계 이동과 진행 표시를 같은 기준으로 관리할 수 있다.
  { id: 'nickname', title: '어떻게 불러드릴까요?' },
  { id: 'gender', title: '성별을 알려주세요' },
  { id: 'birthdate', title: '생년월일을 알려주세요' },
  { id: 'physical', title: '신체 정보를 알려주세요' },
  { id: 'purposes', title: '러닝 목적을 선택해주세요' },
  { id: 'timeSlots', title: '선호 시간대를 골라주세요' },
  { id: 'distance', title: '선호 러닝 거리' },
  { id: 'difficulty', title: '코스 난이도' },
  { id: 'courseTypes', title: '선호 코스 타입' },
] as const;

export const ONBOARDING_PURPOSE_OPTIONS = [
  // option 값은 백엔드 enum 과 1:1 로 맞춰서 저장 단계에서 별도 변환이 필요 없게 유지한다.
  { label: '다이어트', value: 'DIET', accentClassName: 'text-[#3388FF]' },
  {
    label: '건강유지',
    value: 'HEALTH_MAINTENANCE',
    accentClassName: 'text-[#35A55B]',
  },
  {
    label: '대회준비',
    value: 'RACE_PREPARATION',
    accentClassName: 'text-[#7C3AED]',
  },
  {
    label: '체력향상',
    value: 'ENDURANCE_IMPROVEMENT',
    accentClassName: 'text-[#F97316]',
  },
] as const;

export const ONBOARDING_TIME_SLOT_OPTIONS = [
  { label: '새벽', value: 'DAWN' },
  { label: '아침', value: 'MORNING' },
  { label: '오후', value: 'AFTERNOON' },
  { label: '저녁', value: 'EVENING' },
] as const;

export const ONBOARDING_DIFFICULTY_OPTIONS = [
  { label: '쉬움', value: 'EASY' },
  { label: '보통', value: 'MEDIUM' },
  { label: '어려움', value: 'HARD' },
] as const;

export const ONBOARDING_COURSE_TYPE_OPTIONS = [
  { label: '한강변', value: 'RIVERSIDE' },
  { label: '공원', value: 'PARK' },
  { label: '산/둘레길', value: 'MOUNTAIN_TRAIL' },
  { label: '트랙', value: 'TRACK' },
  { label: '도심', value: 'URBAN' },
  { label: '기타', value: 'OTHER' },
] as const;

export const DEFAULT_ONBOARDING_FORM_STATE = {
  nickname: '',
  gender: null,
  birthdate: '',
  height: 170,
  weight: 65,
  purposes: [],
  timeSlots: [],
  preferredDistanceKm: 5,
  preferredDifficulty: null,
  courseTypes: [],
};
