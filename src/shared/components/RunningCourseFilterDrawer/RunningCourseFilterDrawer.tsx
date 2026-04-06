import { RotateCcw, X } from 'lucide-react';
import { Slider } from 'radix-ui';

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/shadcn/drawer';
import { Button } from '@/shared/components/shadcn/button';

export type FilterOption = {
  value: string;
  label: string;
};

export type RunningCourseFilterState = {
  distanceRange: { min: number; max: number };
  courseType: string[];
  difficulty: string[];
  sortBy: string;
};

export type CourseFilterCategory = {
  key: 'courseType' | 'difficulty';
  label: string;
  options: FilterOption[];
};

type RunningCourseFilterDrawerProps = {
  isOpen: boolean;
  categories: CourseFilterCategory[];
  values: RunningCourseFilterState;
  sortOptions: FilterOption[];
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (key: 'courseType' | 'difficulty', value: string) => void;
  onSortByChange: (sortBy: string) => void;
  onDistanceRangeChange: (range: { min: number; max: number }) => void;
};

export function RunningCourseFilterDrawer({
  isOpen,
  categories,
  values,
  sortOptions,
  onClose,
  onApply,
  onReset,
  onChange,
  onSortByChange,
  onDistanceRangeChange,
}: RunningCourseFilterDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DrawerContent className="z-modal border-border-default/[0.1] bg-surface-default px-6 pb-6">
        <DrawerHeader className="gap-3 px-0 text-left">
          <div className="flex items-center justify-between">
            <DrawerTitle className="h3-b">상세 필터</DrawerTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="gap-1"
              >
                <RotateCcw size={14} />
                초기화
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-9"
              >
                <X size={18} />
              </Button>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex max-h-[55vh] flex-col gap-6 overflow-y-auto">
          {/* 정렬 */}
          {sortOptions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="body-l-b">정렬</h3>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSortByChange(option.value)}
                    className={
                      values.sortBy === option.value
                        ? 'rounded-full border-primary-1 bg-primary-1 text-fg-inverse'
                        : 'rounded-full'
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* 거리 범위 슬라이더 */}
          <section className="flex flex-col gap-3">
            <h3 className="body-l-b">거리</h3>
            <div className="flex flex-col gap-3 px-1">
              <Slider.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                min={0}
                max={5000}
                step={500}
                value={[values.distanceRange.min, values.distanceRange.max]}
                onValueChange={([min, max]) =>
                  onDistanceRangeChange({ min, max })
                }
                minStepsBetweenThumbs={1}
              >
                <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-border-default">
                  <Slider.Range className="absolute h-full bg-primary-1" />
                </Slider.Track>
                <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-primary-1 bg-white shadow-md focus-visible:outline-none" />
                <Slider.Thumb className="block h-5 w-5 rounded-full border-2 border-primary-1 bg-white shadow-md focus-visible:outline-none" />
              </Slider.Root>
              <div className="flex justify-between text-sm text-fg-secondary">
                <span>{(values.distanceRange.min / 1000).toFixed(1)}km</span>
                <span>{(values.distanceRange.max / 1000).toFixed(1)}km</span>
              </div>
            </div>
          </section>

          {/* 코스 타입 / 난이도 버튼 필터 */}
          {categories.map((category) => (
            <section key={category.key} className="flex flex-col gap-3">
              <h3 className="body-l-b">{category.label}</h3>

              <div className="flex flex-wrap gap-2">
                {category.options.map((option) => {
                  const valuesForCategory = values[category.key];
                  const isActive =
                    option.value === '전체'
                      ? valuesForCategory.length === 0
                      : valuesForCategory.includes(option.value);

                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onChange(category.key, option.value)}
                      className={
                        isActive
                          ? 'rounded-full border-primary-1 bg-primary-1 text-fg-inverse'
                          : 'rounded-full'
                      }
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <DrawerFooter className="flex-row gap-3 px-0 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            닫기
          </Button>
          <Button type="button" onClick={onApply} className="flex-1">
            필터 적용
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
