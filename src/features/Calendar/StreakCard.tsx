// 연속 러닝 기록 카드 (현재 연속 / 최대 연속)
// data가 null이면 값만 '--' 로 표시
interface StreakCardProps {
  currentStreakDays: number | null;
  longestStreakDays: number | null;
  isLoading: boolean;
}

export function StreakCard({ currentStreakDays, longestStreakDays, isLoading }: StreakCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="body-b text-fg-primary">연속 러닝 기록</p>
      <div className="flex items-center justify-center gap-3 bg-surface-default border border-border-default rounded-lg py-4">
        <div className="flex flex-col items-center">
          <span className="h4-b text-fg-primary">
            {isLoading ? '--' : (currentStreakDays ?? '--')}
            <span className="caption-r text-fg-secondary ml-0.5">일</span>
          </span>
          <span className="caption-r text-fg-secondary">연속</span>
        </div>
        <span className="body-r text-fg-secondary">/</span>
        <div className="flex flex-col items-center">
          <span className="h4-b text-fg-primary">
            {isLoading ? '--' : (longestStreakDays ?? '--')}
            <span className="caption-r text-fg-secondary ml-0.5">일</span>
          </span>
          <span className="caption-r text-fg-secondary">최대</span>
        </div>
      </div>
    </div>
  );
}
