import { useEffect, useRef } from 'react';

// sentinel 요소가 뷰포트에 진입하면 onLoadMore를 자동 호출하는 훅
// hasMore가 false이거나 isLoadingMore 중이면 호출하지 않음
export function useInfiniteScroll(
  hasMore: boolean,
  isLoadingMore: boolean,
  onLoadMore: () => void,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return sentinelRef;
}
