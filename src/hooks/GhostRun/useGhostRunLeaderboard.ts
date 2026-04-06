import { useCallback, useEffect, useState } from 'react';

import {
  getGhostLeaderboardApi,
  type GhostLeaderboardItem,
} from '@/apis';

export function useGhostRunLeaderboard(courseId: number | undefined) {
  const [items, setItems] = useState<GhostLeaderboardItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!courseId || isLoading) return;

    setIsLoading(true);
    try {
      const params = nextCursor ? { size: 10, cursor: nextCursor } : { size: 10 };
      const res = await getGhostLeaderboardApi(courseId, params);
      setItems((prev) => [...prev, ...res.data.items]);
      setHasMore(res.data.hasMore);
      setNextCursor(res.data.nextCursor);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, isLoading, nextCursor]);

  // 최초 1회 자동 로드
  useEffect(() => {
    if (!courseId) return;
    setItems([]);
    setHasMore(false);
    setNextCursor(null);

    setIsLoading(true);
    getGhostLeaderboardApi(courseId, { size: 10 })
      .then((res) => {
        setItems(res.data.items);
        setHasMore(res.data.hasMore);
        setNextCursor(res.data.nextCursor);
      })
      .finally(() => setIsLoading(false));
  }, [courseId]);

  return { items, hasMore, isLoading, loadMore };
}
