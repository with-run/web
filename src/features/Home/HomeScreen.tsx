import { useEffect, useMemo, useState } from 'react';
import { HeartPulse, Route, Settings2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import type {
  Difficulty,
  Purpose,
  TimeSlot,
  UserRunningPreferenceResponse,
} from '@/apis/RunningPreferences';
import {
  getUserRunningPreferences,
  updateUserRunningPreferences,
} from '@/apis/RunningPreferences';
import {
  DEFAULT_ONBOARDING_FORM_STATE,
  ONBOARDING_COURSE_TYPE_OPTIONS,
  ONBOARDING_DIFFICULTY_OPTIONS,
  ONBOARDING_PURPOSE_OPTIONS,
  ONBOARDING_TIME_SLOT_OPTIONS,
} from '@/constants/Onboarding';
import { useAuthStore } from '@/stores/Auth';
import type { CourseType } from '@/apis';
import { cn } from '@/shared/utils';
import { getWeeklyCalendarApi } from '@/apis/userCalendar';
import { useHealthConnectionStatus } from './useHealthConnectionStatus';

type RunningPreferenceFormState = {
  purposes: Purpose[];
  timeSlots: TimeSlot[];
  preferredDistanceKm: number;
  preferredDifficulty: Difficulty | null;
  courseTypes: CourseType[];
};

type PreferenceChipGroupProps<TValue extends string> = {
  label: string;
  options: ReadonlyArray<{
    label: string;
    value: TValue;
  }>;
  selectedValues: TValue[];
  serverValues?: TValue[];
  onToggle: (value: TValue) => void;
  className?: string;
};

type SingleSelectChipGroupProps<TValue extends string> = {
  label: string;
  options: ReadonlyArray<{
    label: string;
    value: TValue;
  }>;
  selectedValue: TValue | null;
  serverSelectedValue?: TValue | null;
  onSelect: (value: TValue) => void;
};

type SummaryCardProps = {
  title: string;
  value: string;
  unit: string;
};

function createDefaultPreferenceState(): RunningPreferenceFormState {
  return {
    purposes: DEFAULT_ONBOARDING_FORM_STATE.purposes,
    timeSlots: DEFAULT_ONBOARDING_FORM_STATE.timeSlots,
    preferredDistanceKm: DEFAULT_ONBOARDING_FORM_STATE.preferredDistanceKm,
    preferredDifficulty: DEFAULT_ONBOARDING_FORM_STATE.preferredDifficulty,
    courseTypes: DEFAULT_ONBOARDING_FORM_STATE.courseTypes,
  };
}

function createPreferenceState(
  response: UserRunningPreferenceResponse
): RunningPreferenceFormState {
  return {
    purposes: response.purposes,
    timeSlots: response.timeSlots,
    preferredDistanceKm: response.preferredDistanceKm ?? 5,
    preferredDifficulty: response.preferredDifficulty,
    courseTypes: response.courseTypes,
  };
}

function toggleSelection<TValue extends string>(
  selectedValues: TValue[],
  value: TValue
): TValue[] {
  return selectedValues.includes(value)
    ? selectedValues.filter((currentValue) => currentValue !== value)
    : [...selectedValues, value];
}

function formatDuration(durationSec: number): string {
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function PreferenceChipGroup<TValue extends string>({
  label,
  options,
  selectedValues,
  serverValues,
  onToggle,
  className,
}: PreferenceChipGroupProps<TValue>) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-secondary">
        {label}
      </h3>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          const wasSelected = serverValues?.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                isSelected && serverValues && !wasSelected
                  ? 'border-success bg-success text-fg-inverse'
                  : !isSelected && serverValues && wasSelected
                    ? 'border-error bg-surface-subtle text-error'
                    : isSelected
                      ? 'border-primary-1 bg-primary-1 text-fg-inverse'
                      : 'border-border-default bg-surface-subtle text-fg-secondary'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SingleSelectChipGroup<TValue extends string>({
  label,
  options,
  selectedValue,
  serverSelectedValue,
  onSelect,
}: SingleSelectChipGroupProps<TValue>) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-fg-secondary">
        {label}
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          const wasSelected =
            serverSelectedValue !== undefined &&
            serverSelectedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'rounded-3xl border px-4 py-4 text-base font-semibold transition-colors',
                isSelected && serverSelectedValue !== undefined && !wasSelected
                  ? 'border-success bg-success text-fg-inverse'
                  : !isSelected &&
                      serverSelectedValue !== undefined &&
                      wasSelected
                    ? 'border-error bg-surface-subtle text-error'
                    : isSelected
                      ? 'border-primary-1 bg-primary-1 text-fg-inverse'
                      : 'border-border-default bg-surface-subtle text-fg-secondary'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SummaryCard({ title, value, unit }: SummaryCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-border-default bg-surface-default p-5 shadow-md flex flex-col items-center text-center">
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black leading-none tracking-tight text-fg-primary">
          {value}
        </span>
        <span className="text-xs font-medium text-fg-secondary">
          {unit}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-fg-secondary">
        {title}
      </p>
    </article>
  );
}

export function HomeScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { label: healthConnectionLabel, isConnected } =
    useHealthConnectionStatus();
  const [weeklySummary, setWeeklySummary] = useState<{
    runCount: number;
    distanceKm: number;
    caloriesKcal: number;
    durationSec: number;
  } | null>(null);
  const [preferences, setPreferences] = useState<RunningPreferenceFormState>(
    createDefaultPreferenceState()
  );
  const [serverPreferences, setServerPreferences] =
    useState<RunningPreferenceFormState | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const summaryCards = useMemo(
    () => [
      {
        title: '이번 주 러닝',
        value: weeklySummary ? String(weeklySummary.runCount) : '--',
        unit: '회',
      },
      {
        title: '총 거리',
        value: weeklySummary ? weeklySummary.distanceKm.toFixed(1) : '--',
        unit: 'km',
      },
      {
        title: '소모 칼로리',
        value: weeklySummary
          ? weeklySummary.caloriesKcal.toLocaleString('ko-KR')
          : '--',
        unit: 'kcal',
      },
      {
        title: '총 운동 시간',
        value: weeklySummary ? formatDuration(weeklySummary.durationSec) : '--',
        unit: '',
      },
    ],
    [weeklySummary]
  );

  const isPreferencesChanged =
    serverPreferences === null ||
    [...preferences.purposes].sort().join() !==
      [...serverPreferences.purposes].sort().join() ||
    [...preferences.timeSlots].sort().join() !==
      [...serverPreferences.timeSlots].sort().join() ||
    [...preferences.courseTypes].sort().join() !==
      [...serverPreferences.courseTypes].sort().join() ||
    preferences.preferredDistanceKm !== serverPreferences.preferredDistanceKm ||
    preferences.preferredDifficulty !== serverPreferences.preferredDifficulty;

  const canSavePreferences =
    preferences.purposes.length > 0 &&
    preferences.timeSlots.length > 0 &&
    preferences.preferredDifficulty !== null &&
    preferences.courseTypes.length > 0 &&
    isPreferencesChanged;

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        const response = await getWeeklyCalendarApi();
        if (isCancelled) return;
        const {
          weeklyRunCount,
          weeklyDistanceM,
          weeklyCaloriesKcal,
          weeklyDurationSec,
        } = response.data;
        setWeeklySummary({
          runCount: weeklyRunCount,
          distanceKm: weeklyDistanceM / 1000,
          caloriesKcal: weeklyCaloriesKcal,
          durationSec: weeklyDurationSec,
        });
      } catch {
        // 실패 시 카드는 '--' 유지
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        // 홈에서는 저장된 선호도를 먼저 hydrate 해서 온보딩 이후 수정 화면처럼 재사용한다.
        const response = await getUserRunningPreferences();

        if (isCancelled) {
          return;
        }

        const preferenceState = createPreferenceState(response);
        setPreferences(preferenceState);
        setServerPreferences(preferenceState);
      } catch {
        if (isCancelled) {
          return;
        }

        toast.error('러닝 선호도 정보를 불러오지 못했어요.');
      } finally {
        if (!isCancelled) {
          setIsLoadingPreferences(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function handleSavePreferences() {
    if (!canSavePreferences || isSavingPreferences) {
      return;
    }

    setIsSavingPreferences(true);

    try {
      await updateUserRunningPreferences({
        purposes: preferences.purposes,
        timeSlots: preferences.timeSlots,
        preferredDistanceKm: preferences.preferredDistanceKm,
        preferredDifficulty: preferences.preferredDifficulty!,
        courseTypes: preferences.courseTypes,
      });

      // 저장 직후 서버 값을 다시 읽어 화면 상태와 실제 저장값이 어긋나지 않게 맞춘다.
      const response = await getUserRunningPreferences();
      const preferenceState = createPreferenceState(response);
      setPreferences(preferenceState);
      setServerPreferences(preferenceState);
      toast.success('러닝 선호도가 저장되었어요.');
    } catch {
      toast.error('러닝 선호도를 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsSavingPreferences(false);
    }
  }

  return (
    <div className="-m-5 min-h-[calc(100dvh-5rem)] overflow-hidden bg-surface-subtle text-fg-primary">
      <div className="relative min-h-full px-5 pb-10 pt-6">
        <div className="relative mx-auto flex max-w-[430px] flex-col gap-6">
          <section className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-default px-4 py-2 text-xs font-bold tracking-[0.08em] text-fg-secondary">
              <HeartPulse
                size={14}
                className={
                  isConnected
                    ? 'text-success'
                    : 'text-fg-secondary'
                }
              />
              {healthConnectionLabel}
            </div>

            <div className="space-y-2 pl-2">
              <h1 className="leading-tight tracking-tight text-fg-primary">
                <span className="block text-base font-black">달려볼까요,</span>
                <span className="block text-2xl font-black">
                  {user?.nickname ?? 'Runner'}님
                </span>
              </h1>
              <p className="max-w-[14rem] text-base leading-7 text-fg-secondary">
                오늘도 목표를 향해 달려보세요!
              </p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <SummaryCard {...summaryCards[0]} />
            <SummaryCard {...summaryCards[1]} />
            <SummaryCard {...summaryCards[2]} />
            <SummaryCard {...summaryCards[3]} />
          </section>

          <section>
            <button
              type="button"
              onClick={() => navigate('/reward-gacha')}
              className="flex w-full items-center justify-between rounded-[2rem] border border-border-default bg-surface-default p-5 shadow-md transition-colors hover:bg-surface-subtle"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary-1 p-3 text-fg-inverse">
                  <Gift size={24} />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-black text-fg-primary">
                    리워드 뽑기
                  </h2>
                  <p className="text-sm text-fg-secondary">
                    포인트로 스페셜 아이템 획득
                  </p>
                </div>
              </div>
              <div className="text-fg-secondary">
                <Route size={20} className="rotate-45" />
              </div>
            </button>
          </section>

          <section className="rounded-[2rem] border border-border-default bg-surface-default p-5 shadow-md">
            <div className="mb-5 flex items-center gap-2 text-xl font-black text-fg-primary">
              <Settings2 size={18} className="text-primary-1" />
              러닝 선호도 설정
            </div>

            {isLoadingPreferences ? (
              <div className="rounded-3xl border border-border-default bg-surface-subtle px-4 py-10 text-center text-sm text-fg-secondary">
                저장된 러닝 선호도를 불러오는 중이에요.
              </div>
            ) : (
              <div className="space-y-7">
                <PreferenceChipGroup
                  label="러닝 목적"
                  options={ONBOARDING_PURPOSE_OPTIONS}
                  selectedValues={preferences.purposes}
                  serverValues={serverPreferences?.purposes}
                  onToggle={(value) =>
                    setPreferences((currentState) => ({
                      ...currentState,
                      purposes: toggleSelection(currentState.purposes, value),
                    }))
                  }
                />

                <PreferenceChipGroup
                  label="선호 시간대"
                  options={ONBOARDING_TIME_SLOT_OPTIONS}
                  selectedValues={preferences.timeSlots}
                  serverValues={serverPreferences?.timeSlots}
                  onToggle={(value) =>
                    setPreferences((currentState) => ({
                      ...currentState,
                      timeSlots: toggleSelection(currentState.timeSlots, value),
                    }))
                  }
                />

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-fg-secondary">
                      선호 러닝 거리
                    </h3>
                    <p className="text-3xl font-black text-primary-1">
                      {preferences.preferredDistanceKm.toFixed(1)}
                      <span className="ml-1 text-lg text-fg-secondary">
                        km
                      </span>
                    </p>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={preferences.preferredDistanceKm}
                    onChange={(event) =>
                      setPreferences((currentState) => ({
                        ...currentState,
                        preferredDistanceKm: Number(event.target.value),
                      }))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border-default accent-primary-1"
                  />
                  <div className="flex justify-between text-xs font-semibold text-fg-secondary">
                    <span>1 km</span>
                    <span>10 km</span>
                  </div>
                </section>

                <PreferenceChipGroup
                  label="코스 타입"
                  options={ONBOARDING_COURSE_TYPE_OPTIONS}
                  selectedValues={preferences.courseTypes}
                  serverValues={serverPreferences?.courseTypes}
                  onToggle={(value) =>
                    setPreferences((currentState) => ({
                      ...currentState,
                      courseTypes: toggleSelection(
                        currentState.courseTypes,
                        value
                      ),
                    }))
                  }
                  className="gap-2.5"
                />

                <SingleSelectChipGroup
                  label="코스 난이도"
                  options={ONBOARDING_DIFFICULTY_OPTIONS}
                  selectedValue={preferences.preferredDifficulty}
                  serverSelectedValue={serverPreferences?.preferredDifficulty}
                  onSelect={(value) =>
                    setPreferences((currentState) => ({
                      ...currentState,
                      preferredDifficulty: value,
                    }))
                  }
                />

                <button
                  type="button"
                  onClick={() => void handleSavePreferences()}
                  disabled={!canSavePreferences || isSavingPreferences}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-1 px-4 py-4 text-lg font-black text-fg-inverse transition-colors',
                    canSavePreferences && !isSavingPreferences
                      ? 'hover:bg-primary-1-hover'
                      : 'pointer-events-none opacity-45'
                  )}
                >
                  <Route size={18} />
                  {isSavingPreferences ? '저장 중...' : '저장하기'}
                </button>
              </div>
            )}
          </section>

          <div className="h-8" />
        </div>
      </div>
    </div>
  );
}
