import type { RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useInfiniteScroll } from '@/shared/hooks';
import { formatDateLabel, formatStartTime } from '@/shared/utils';
import type { RunningHistoryItem } from '@/apis/runningSessions';

const SCROLL_KEY = 'calendarScrollY';

const TIME_SLOT_LABEL: Record<string, string> = {
  DAWN: '새벽',
  MORNING: '오전',
  AFTERNOON: '오후',
  EVENING: '저녁',
};

const RUNNING_MODE_LABEL: Record<string, string> = {
  FREE: '자유',
  COURSE: '일반',
  GHOST: '고스트',
};

const GHOST_RESULT_STYLE: Record<string, { label: string; className: string }> = {
  WIN:  { label: '승리', className: 'bg-success/[0.15] text-success' },
  LOSE: { label: '패배', className: 'bg-error/[0.15] text-error' },
  DRAW: { label: '무승부', className: 'bg-surface-subtle text-fg-secondary' },
};

// 날짜 순서를 유지하면서 날짜별로 그룹핑
function groupByDate(items: RunningHistoryItem[]): { dateKey: string; sessions: RunningHistoryItem[] }[] {
  const groups: { dateKey: string; sessions: RunningHistoryItem[] }[] = [];
  for (const item of items) {
    // 1. ISO 문자열에서 날짜만 추출 ("2026-03-16")
    const dateKey = item.startedAt.slice(0, 10);
    // 2. 마지막 그룹과 날짜 비교
    const last = groups[groups.length - 1];
    // 3. 같은 날짜면 기존 그룹에 추가, 다른 날짜면 새 그룹 생성
    if (last?.dateKey === dateKey) {
      last.sessions.push(item);
    } else {
      groups.push({ dateKey, sessions: [item] });
    }
  }
  return groups;
}

// 초 -> "m:ss" (예: 1930 -> "32:10")
function formatDuration(sec: number | null): string {
  if (sec === null) return '--';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// 페이스: 초/미터 -> "M'SS\"/km" (예: 6'11"/km)
function formatPace(distanceM: number, durationSec: number | null): string {
  if (!durationSec || distanceM === 0) return '--';
  const paceSecPerKm = (durationSec / distanceM) * 1000;
  let paceMin = Math.floor(paceSecPerKm / 60);
  let paceSec = Math.round(paceSecPerKm % 60);
  if (paceSec === 60) {
    paceMin += 1;
    paceSec = 0;
  }
  return `${paceMin}'${String(paceSec).padStart(2, '0')}"/km`;
}

interface RunningHistoryListProps {
  title: string;
  items: RunningHistoryItem[];
  isLoading: boolean;
  hasMore: boolean;
  isScrollLoading: boolean;
  showDateHeader: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
}

function SessionCard({ session, scrollRef }: { session: RunningHistoryItem; scrollRef: RefObject<HTMLDivElement | null> }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        sessionStorage.setItem(SCROLL_KEY, String(scrollRef.current?.scrollTop ?? 0));
        navigate(`/calendar/${session.runningSessionId}`);
      }}
      className="w-full text-left rounded-xl border border-border-default bg-surface-default p-3 flex gap-3 items-center active:opacity-70 transition-opacity">
      {/* 스냅샷 썸네일 */}
      <div className="w-16 h-16 rounded-lg bg-surface-subtle flex-shrink-0 overflow-hidden">
        {session.snapshotImageUrl ? (
          <img
            src={session.snapshotImageUrl}
            alt="러닝 스냅샷"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-secondary">
            <MapPin size={20} />
          </div>
        )}
      </div>

      {/* 러닝 정보 */}
      <div className="flex-1 flex flex-col gap-2">
        {/* 시간대 + 시각 */}
        <div className="flex justify-between items-center">
          <span className="body-b text-fg-primary">
            {TIME_SLOT_LABEL[session.timeSlot] ?? session.timeSlot} 러닝
          </span>
          <span className="caption-r text-fg-secondary">
            {formatStartTime(session.startedAt)}
          </span>
        </div>

        {/* 거리 • 시간 • 페이스 */}
        <div className="flex items-center justify-between body-r text-fg-secondary">
          <span>{(session.distanceM / 1000).toFixed(2)} km</span>
          <span>•</span>
          <span>{formatDuration(session.durationSec)}</span>
          <span>•</span>
          <span>{formatPace(session.distanceM, session.durationSec)}</span>
        </div>

        {/* 모드 태그 + 고스트런 결과 */}
        <div className="flex gap-1">
          <span className="caption-r px-2 py-0.5 rounded-full bg-surface-subtle text-fg-secondary">
            {RUNNING_MODE_LABEL[session.runningMode] ?? session.runningMode}
          </span>
          {session.ghostResultStatus && GHOST_RESULT_STYLE[session.ghostResultStatus] && (
            <span className={`caption-r px-2 py-0.5 rounded-full ${GHOST_RESULT_STYLE[session.ghostResultStatus].className}`}>
              {GHOST_RESULT_STYLE[session.ghostResultStatus].label}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function RunningHistoryList({ title, items, isLoading, hasMore, isScrollLoading, showDateHeader, scrollRef, onLoadMore }: RunningHistoryListProps) {
  // 목록 끝에 위치한 sentinel 요소가 뷰포트에 들어오면 자동으로 다음 페이지 로드
  const sentinelRef = useInfiniteScroll(hasMore, isScrollLoading, onLoadMore);

  return (
    <div className="flex flex-col gap-3">
      <p className="body-b text-fg-primary">{title}</p>

      {isLoading && (
        <div className="rounded-xl border border-border-default bg-surface-default p-4 flex justify-center">
          <span className="body-r text-fg-secondary">로딩 중...</span>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-border-default bg-surface-default p-4 text-center">
          <p className="body-r text-fg-secondary">러닝 기록이 없습니다.</p>
        </div>
      )}

      {!isLoading && showDateHeader
        ? groupByDate(items).map(({ dateKey, sessions }) => (
            <div key={dateKey} className="flex flex-col gap-2">
              <p className="caption-b text-fg-secondary">{formatDateLabel(dateKey)}</p>
              {sessions.map((session) => (
                <SessionCard key={session.runningSessionId} session={session} scrollRef={scrollRef} />
              ))}
            </div>
          ))
        : !isLoading && items.map((session) => (
            <SessionCard key={session.runningSessionId} session={session} scrollRef={scrollRef} />
          ))}

      {/* 스크롤 감지용 sentinel — 뷰포트 진입 시 다음 페이지 자동 로드 */}
      <div ref={sentinelRef} />

      {isScrollLoading && (
        <div className="flex justify-center py-2">
          <span className="caption-r text-fg-secondary">불러오는 중...</span>
        </div>
      )}
    </div>
  );
}
