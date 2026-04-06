// 요약 통계 카드 (러닝 횟수, 총 거리)
// label: "전체 요약" (달력 닫힘) | "월별 요약" (달력 열림)
// data가 null이면 카드 틀은 유지하고 값만 '--' 로 표시
interface ActivitySummaryProps {
  label: string;
  runCount: number | null;
  distanceM: number | null;
  isLoading: boolean;
}

interface StatCardProps {
  value: string;
  unit: string;
  description: string;
}

function StatCard({ value, unit, description }: StatCardProps) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1 bg-surface-default border border-border-default rounded-lg py-3 px-2">
      <div className="flex items-baseline gap-1">
        <span className="h4-b text-fg-primary">{value}</span>
        <span className="caption-r text-fg-secondary">{unit}</span>
      </div>
      <span className="caption-r text-fg-secondary">{description}</span>
    </div>
  );
}

export function ActivitySummary({ label, runCount, distanceM, isLoading }: ActivitySummaryProps) {
  const distanceKm = !isLoading && distanceM !== null ? (distanceM / 1000).toFixed(2) : '--';

  return (
    <div className="flex flex-col gap-2">
      <p className="body-b text-fg-primary">{label}</p>
      <div className="flex gap-3">
        <StatCard
          value={!isLoading && runCount !== null ? String(runCount) : '--'}
          unit="회"
          description="러닝 횟수"
        />
        <StatCard
          value={distanceKm}
          unit="km"
          description="총 거리"
        />
      </div>
    </div>
  );
}
