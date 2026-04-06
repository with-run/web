import { useState } from 'react';
import { Gift, Sparkles, X } from 'lucide-react';

import type { RewardGachaDrawCardResponse } from '@/apis/rewardGacha';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/shadcn/dialog';
import { cn } from '@/shared/utils';

interface RewardDrawRevealProps {
  cards: RewardGachaDrawCardResponse[];
  onClose: () => void;
}

export function RewardDrawReveal({ cards, onClose }: RewardDrawRevealProps) {
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const displayCards = cards.slice(0, 3);

  const handleFlip = (index: number) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  };

  const handleRevealAll = () => {
    setFlippedCards(new Set(displayCards.map((_, i) => i)));
  };

  const allFlipped = flippedCards.size === displayCards.length;

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open && allFlipped) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={allFlipped}
        onInteractOutside={(e) => {
          if (!allFlipped) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!allFlipped) {
            e.preventDefault();
          }
        }}
        className="max-w-[380px] gap-6 p-6"
      >
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-black">
            가챠 결과
          </DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            'grid gap-3',
            displayCards.length === 1
              ? 'grid-cols-1 px-12'
              : displayCards.length === 2
                ? 'grid-cols-2 px-4'
                : 'grid-cols-3'
          )}
        >
          {displayCards.map((card, index) => {
            const isFlipped = flippedCards.has(index);
            const isReward = card.cardType === 'REWARD';
            const isThreeCards = displayCards.length === 3;

            return (
              <button
                key={card.rewardGachaDrawCardId}
                type="button"
                onClick={() => handleFlip(index)}
                disabled={isFlipped}
                className={cn(
                  'relative aspect-[3/4] w-full transition-transform duration-300',
                  !isFlipped && 'hover:scale-105 active:scale-95'
                )}
              >
                {!isFlipped ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-border-strong bg-surface-default shadow-md">
                    <div
                      className={cn(
                        'rounded-full bg-primary-5 text-primary-2',
                        isThreeCards ? 'mb-2 p-2' : 'mb-3 p-4'
                      )}
                    >
                      <Gift size={isThreeCards ? 24 : 40} />
                    </div>
                    <span
                      className={cn(
                        'font-bold tracking-[0.14em] text-fg-secondary',
                        isThreeCards ? 'text-[10px]' : 'text-sm'
                      )}
                    >
                      {isThreeCards ? 'TAP' : 'TAP TO OPEN'}
                    </span>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 p-2 shadow-md animate-in fade-in zoom-in duration-300',
                      isReward
                        ? 'border-primary-3 bg-surface-default'
                        : 'border-border-default bg-surface-subtle'
                    )}
                  >
                    {isReward ? (
                      <>
                        <div
                          className={cn(
                            'relative flex items-center justify-center overflow-hidden rounded-full bg-surface-subtle',
                            isThreeCards ? 'mb-2 h-12 w-12' : 'mb-4 h-20 w-20'
                          )}
                        >
                          <img
                            src={card.imageUrl!}
                            alt={card.title!}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span
                          className={cn(
                            'text-center font-bold text-fg-primary line-clamp-2',
                            isThreeCards ? 'text-[10px]' : 'text-sm'
                          )}
                        >
                          {card.title}
                        </span>
                        <Sparkles
                          size={isThreeCards ? 16 : 24}
                          className="absolute right-2 top-2 text-primary-3"
                        />
                      </>
                    ) : (
                      <>
                        <div
                          className={cn(
                            'text-fg-secondary',
                            isThreeCards ? 'mb-2' : 'mb-4'
                          )}
                        >
                          <X size={isThreeCards ? 32 : 48} />
                        </div>
                        <span
                          className={cn(
                            'text-center font-bold text-fg-secondary',
                            isThreeCards ? 'text-[10px]' : 'text-sm'
                          )}
                        >
                          아쉽네요!
                          {!isThreeCards && (
                            <>
                              <br />
                              다음 기회에
                            </>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          {!allFlipped ? (
            <button
              type="button"
              onClick={handleRevealAll}
              className="w-full rounded-2xl bg-primary-1 px-4 py-4 text-xl font-black text-fg-inverse transition-all hover:bg-primary-1-hover active:scale-95"
            >
              모두 열기
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-surface-subtle px-4 py-4 text-xl font-black text-fg-primary transition-all hover:bg-surface-muted active:scale-95"
            >
              닫기
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
