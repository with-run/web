import { cn } from '@/shared/utils';

// 놀랍게도 실무에서 자주 쓰인다는 패턴..이랍니다 (as const: 절대 안바뀜 (ts에 알려주는 키워드))
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

interface CalendarGridProps {
  year: number;
  month: number;
  activeDates: Set<string>;
  selectedDate: string | null;
  today: Date;
  onSelectDate: (date: string) => void;
}

// API 날짜 형식 YYYY-MM-DD 문자열에 맞추기
function toDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function CalendarGrid({
  year,
  month,
  activeDates,
  selectedDate,
  today,
  onSelectDate,
}: CalendarGridProps) {
  // 이번 달 1일이 무슨 요일인가?! (JS Date는 월이 0-indexed)
  // 달력 그리드 첫 줄에서 1일 앞에 빈 칸을 몇 개 넣을지 결정
  const firstDay = new Date(year, month - 1, 1).getDay();
  // 이번 달이 며칠까지 있나?!
  // month(다음달) + 0일 = 이번 달 마지막 날
  // JS에서 0일은 전달의 마지막 날을 의미
  const daysInMonth = new Date(year, month, 0).getDate();

  // 오늘 YYYY-MM-DD
  const todayStr = toDateString(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );

  // useCalendar.ts의 isCurrentMonth
  // const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  // 같은 식이지만, 용도가 다르고, useCalendar의 isCurrentMonth를
  // props로 받을 수도 있었지만, CalendarGrid가 today를 이미 받고 있어
  // 자체적으로 계산하는게 더 단순함

  // useCalendar.ts: goNext() 막기 + CalendarHeader에 > 버튼 비활성화
  // CalendarGrid.tsx: 각 날짜 셀에서 미래 날짜 비활성화
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  // 달력 7 * N 그리드에 들어갈 값들의 배열
  // null과 숫자로 이루어짐 (JSX에서 map()으로 돌리면
  // null -> 빈 <div>, number -> 날짜 숫자가 있는 셀)
  const cells: (number | null)[] = [
    // 앞부분: 빈 칸들
    // ex) 1일이 수요일(3)이면 -> [null, null, null] (일, 월, 화)
    ...Array<null>(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      {/* 요일 헤더 -> 일, 월, 화, 수, 목, 금, 토 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label) => (
          <div key={label} className="flex justify-center py-2">
            <span className="caption-m text-fg-secondary">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          // 1. null이면 빈칸
          // 1일 앞의 빈 칸들 안그림
          if (day === null) {
            return <div key={`empty-${idx}`} />;
          }

          // 2. 이 날짜의 상태 계산
          // "2026-03-15"
          const dateStr = toDateString(year, month, day);
          // 운동 기록 있나?
          const isActive = activeDates.has(dateStr);
          // 클릭해서 선택됨?
          const isSelected = selectedDate === dateStr;
          // 오늘?
          const isToday = dateStr === todayStr;
          // 미래?
          const isFuture = isCurrentMonth && day > today.getDate();

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              disabled={isFuture}
              className="flex flex-col items-center gap-1 py-2"
            >
              {/* 우선순위: isSelected > isToday > 일반 > isFuture */}
              <span
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded-full caption-m transition-colors',
                  isSelected &&
                    'bg-primary-1 text-fg-inverse',
                  !isSelected && isToday && 'border border-primary-1 text-primary-1',
                  !isSelected && !isToday && !isFuture && 'text-fg-primary',
                  isFuture && 'text-fg-disabled',
                )}
              >
                {day}
              </span>
              {/* 운동 기록 있고 미래가 아니면 빨간 점 표시 */}
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isActive && !isFuture ? 'bg-primary-1' : 'invisible',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
