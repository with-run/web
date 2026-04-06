import { useParams } from 'react-router-dom';

import { useCalendarDetail } from '@/hooks/Calendar';
import { CalendarDetailScreen, CalendarDetailHeader } from '@/features/Calendar';

export function CalendarDetailPage() {
  const { runningSessionId } = useParams();
  const { detail, isLoading, isError } = useCalendarDetail(Number(runningSessionId));

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col bg-surface-subtle">
        <CalendarDetailHeader />
        <div className="flex flex-1 items-center justify-center">
          <p className="body-r text-fg-secondary">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isError || !detail) {
    return (
      <div className="absolute inset-0 flex flex-col bg-surface-subtle">
        <CalendarDetailHeader />
        <div className="flex flex-1 items-center justify-center">
          <p className="body-r text-fg-secondary">기록을 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return <CalendarDetailScreen detail={detail} />;
}
