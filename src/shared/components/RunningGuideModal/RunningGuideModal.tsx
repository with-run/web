import { useRef, useState } from 'react';

import { Button } from '@/shared/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/shadcn/dialog';

type GuideStep = {
  title: string;
  content: string;
};

type RunningGuideModalProps = {
  isOpen: boolean;
  onClose: () => void;
  steps: GuideStep[];
};

export function RunningGuideModal({
  isOpen,
  onClose,
  steps,
}: RunningGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (!isOpen) {
    return null;
  }

  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function handleNext() {
    if (currentStep === steps.length - 1) {
      onClose();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }

  function handleTouchStart(clientX: number) {
    touchStartX.current = clientX;
  }

  function handleTouchEnd(clientX: number) {
    if (touchStartX.current === null) {
      return;
    }

    const diff = touchStartX.current - clientX;
    const swipeThreshold = 40;

    if (diff > swipeThreshold && currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }

    if (diff < -swipeThreshold && currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }

    touchStartX.current = null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-[343px] gap-6 rounded-xl bg-surface-default p-6 shadow-lg">
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="h3-b text-fg-primary">
            러닝 가이드
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="caption-m text-fg-secondary">
            {currentStep + 1} / {steps.length}
          </span>

          <div className="flex items-center gap-2">
            {steps.map((step, index) => (
              <span
                key={step.title}
                className={
                  index === currentStep
                    ? 'h-2 w-6 rounded-full bg-primary-1'
                    : 'h-2 w-2 rounded-full bg-border-strong'
                }
              />
            ))}
          </div>
        </div>

        <div
          className="overflow-hidden"
          onTouchStart={(event) => {
            handleTouchStart(event.touches[0].clientX);
          }}
          onTouchEnd={(event) => {
            handleTouchEnd(event.changedTouches[0].clientX);
          }}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentStep * 100}%)` }}
          >
            {steps.map((step) => (
              <div
                key={step.title}
                className="w-full shrink-0 rounded-lg border border-border-default bg-surface-subtle p-4"
              >
                <div className="flex flex-col gap-3">
                  <h3 className="body-l-b text-fg-primary">
                    {step.title}
                  </h3>
                  <p className="body-r text-fg-secondary">
                    {step.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-3">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            이전
          </Button>

          <Button onClick={handleNext}>
            {currentStep === steps.length - 1 ? '확인' : '다음'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
