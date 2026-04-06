import { PackageOpen, X } from 'lucide-react';

import { useRewardInventory } from '@/hooks/RewardGacha';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/shadcn/dialog';

interface RewardInventoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RewardInventory({ isOpen, onClose }: RewardInventoryProps) {
  const { data, isLoading, isError } = useRewardInventory(isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[80dvh] w-[calc(100%-2rem)] max-w-[360px] flex-col gap-0 rounded-[2rem] border border-border-default bg-surface-default p-0 text-fg-primary shadow-xl"
      >
        <DialogHeader className="flex-none border-b border-border-default px-5 py-4 text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageOpen size={24} className="text-primary-3" />
              <DialogTitle className="text-xl font-black text-fg-primary">
                내 인벤토리
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full text-fg-secondary hover:bg-surface-subtle active:opacity-70"
                aria-label="닫기"
              >
                <X size={22} />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <span className="text-sm text-fg-secondary animate-pulse">
                인벤토리 불러오는 중...
              </span>
            </div>
          ) : isError || !data ? (
            <div className="flex h-40 items-center justify-center">
              <span className="text-sm text-fg-secondary">
                인벤토리를 불러오지 못했어요.
              </span>
            </div>
          ) : data.items.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-4">
              <PackageOpen size={48} className="text-border-strong" />
              <span className="text-sm text-fg-secondary">
                아직 획득한 리워드가 없습니다.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {data.items.map((item) => (
                <div
                  key={item.rewardGachaDrawCardId}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-border-default bg-surface-subtle p-2.5 shadow-sm"
                >
                  <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-default">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="w-full text-center">
                    <span className="block text-xs font-bold text-fg-primary line-clamp-2 leading-tight">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[9px] text-fg-secondary">
                      {new Date(item.acquiredAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
