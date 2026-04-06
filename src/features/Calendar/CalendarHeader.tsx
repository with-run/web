// 월 네비게이션 헤더 (< 2026년 3월 >)

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/utils';

interface CalendarHeaderProps {
  year: number;
  month: number;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function CalendarHeader({
  year,
  month,
  isCurrentMonth,
  onPrev,
  onNext,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-2">
      <button
        type="button"
        onClick={onPrev}
        className="p-2 rounded-full hover:bg-surface-subtle text-fg-primary"
      >
        <ChevronLeft size={20} />
      </button>

      <h2 className="h3-b text-fg-primary">
        {year}년 {month}월
      </h2>

      <button
        type="button"
        onClick={onNext}
        disabled={isCurrentMonth}
        className={cn(
          'p-2 rounded-full text-fg-primary hover:bg-surface-subtle',
          isCurrentMonth && 'text-fg-disabled cursor-not-allowed hover:bg-transparent',
        )}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
