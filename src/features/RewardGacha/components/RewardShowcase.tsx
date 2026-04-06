import { useRewardShowcase } from '@/hooks/RewardGacha';
import { useEffect, useState } from 'react';

type RewardItem = NonNullable<ReturnType<typeof useRewardShowcase>['data']>['items'][0];
type CarouselItem = RewardItem & { uniqueKey: string };

export function RewardShowcase() {
  const { data, isLoading, isError } = useRewardShowcase();
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!data?.items || data.items.length === 0) return;
    
    let duplicated = [...data.items];
    // Ensure we have enough items to fill the screen and loop smoothly
    while (duplicated.length < 10) {
      duplicated = [...duplicated, ...data.items];
    }
    
    setItems(
      duplicated.map((item, i) => ({
        ...item,
        uniqueKey: `${item.rewardItemId}-${i}`,
      }))
    );
  }, [data?.items]);

  const hasItems = items.length > 0;

  useEffect(() => {
    if (!hasItems) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setIsTransitioning(false);
        setItems((prev) => {
          if (prev.length === 0) return prev;
          const newItems = [...prev];
          const first = newItems.shift();
          if (first) {
            newItems.push(first);
          }
          return newItems;
        });
      }, 500); // Match transition duration
    }, 2400);

    return () => clearInterval(timer);
  }, [hasItems]);

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-border-default bg-surface-default">
        <span className="text-sm text-fg-secondary animate-pulse">
          쇼케이스 불러오는 중...
        </span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-border-default bg-surface-default">
        <span className="text-sm text-fg-secondary">
          쇼케이스를 불러오지 못했어요.
        </span>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-border-default bg-surface-default">
        <span className="text-sm text-fg-secondary">
          현재 전시 중인 리워드가 없습니다.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <div
        className="flex gap-4 pb-4"
        style={{
          transform: isTransitioning ? 'translateX(calc(-140px - 1rem))' : 'translateX(0)',
          transition: isTransitioning ? 'transform 500ms ease-in-out' : 'none',
        }}
      >
        {items.map((item) => (
          <div
            key={item.uniqueKey}
            className="flex w-[140px] shrink-0 flex-col items-center gap-3 rounded-2xl border border-border-default bg-surface-default p-4 shadow-sm"
          >
            <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface-subtle">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-center text-xs font-bold text-fg-primary line-clamp-2">
              {item.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
