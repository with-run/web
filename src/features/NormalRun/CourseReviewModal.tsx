import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/shadcn/drawer';
import { cn } from '@/shared/utils';
import type { CourseDifficulty, CourseType } from '@/apis';
import { postCourseReviewApi } from '@/apis/course';

type Step = 'rating' | 'detail';

const DIFFICULTY_OPTIONS: { data: CourseDifficulty; label: string }[] = [
  { data: 'EASY', label: '쉬움' },
  { data: 'MEDIUM', label: '보통' },
  { data: 'HARD', label: '어려움' },
];

const COURSE_TYPE_OPTIONS: { data: CourseType; label: string }[] = [
  { data: 'RIVERSIDE', label: '한강변' },
  { data: 'PARK', label: '공원' },
  { data: 'MOUNTAIN_TRAIL', label: '산/둘레길' },
  { data: 'TRACK', label: '트랙' },
  { data: 'URBAN', label: '도심' },
  { data: 'OTHER', label: '기타' },
];

type CourseReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  onDone: () => void;
};

export function CourseReviewModal({
  isOpen,
  onClose,
  courseId,
  onDone,
}: CourseReviewModalProps) {
  const [step, setStep] = useState<Step>('rating');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [difficulty, setDifficulty] = useState<CourseDifficulty | null>(null);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('rating');
      setRating(0);
      setHoveredRating(0);
      setDifficulty(null);
      setCourseTypes([]);
    }
  }, [isOpen]);

  function handleRatingSelect(value: number) {
    setRating(value);
    setStep('detail');
  }

  function toggleCourseType(type: CourseType) {
    setCourseTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit() {
    if (!difficulty || rating === 0) return;
    setIsSubmitting(true);
    try {
      await postCourseReviewApi(courseId, {
        rating,
        courseTypes,
        submittedDifficulty: difficulty,
      });
      onClose();
      onDone();
    } catch {
      // 리뷰는 선택 사항이므로 오류 시 모달만 닫음
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-secondary-2 border-t border-secondary-3 max-h-[85dvh]">
        {step === 'rating' ? (
          <>
            <DrawerHeader className="text-center px-6 pt-6 pb-0">
              <div className="flex justify-center mb-3">
                <div className="p-3 rounded-full bg-primary/20">
                  <Star size={28} className="text-primary fill-primary" />
                </div>
              </div>
              <DrawerTitle className="h3-b text-fg-inverse">
                코스 추천 시스템이 어땠나요?
              </DrawerTitle>
              <p className="body-r text-secondary-5 mt-1">
                리뷰를 남겨 도움을 제공하세요.
              </p>
            </DrawerHeader>

            <div className="px-6 pb-8 pt-6 space-y-6">
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleRatingSelect(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1"
                  >
                    <Star
                      size={40}
                      className={cn(
                        'transition-colors',
                        value <= (hoveredRating || rating)
                          ? 'text-primary fill-primary'
                          : 'text-secondary-5'
                      )}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-secondary-3 text-secondary-5 body-b"
              >
                나중에 하기
              </button>
            </div>
          </>
        ) : (
          <>
            <DrawerHeader className="text-center px-6 pt-6 pb-0">
              <DrawerTitle className="h3-b text-fg-inverse">
                상세 평가
              </DrawerTitle>
              <p className="body-r text-secondary-5 mt-1">
                더 자세한 정보를 입력해 주시면
                <br />
                도움이 됩니다
              </p>
            </DrawerHeader>

            <div className="overflow-y-auto px-6 pb-8 pt-4 space-y-5">
              {/* 코스 난이도 */}
              <div className="space-y-2">
                <label className="caption-b text-fg-inverse flex items-center gap-1.5">
                  <span className="inline-block w-1 h-3.5 bg-primary rounded-full" />
                  코스 난이도
                </label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map(({ data, label }) => (
                    <button
                      key={data}
                      onClick={() => setDifficulty(data)}
                      className={cn(
                        'flex-1 py-2 rounded-xl caption-m transition-colors border',
                        difficulty === data
                          ? 'bg-primary text-fg-inverse border-transparent'
                          : 'bg-secondary-3 text-secondary-5 border-secondary-4'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 코스 타입 */}
              <div className="space-y-2">
                <label className="caption-b text-fg-inverse flex items-center gap-1.5">
                  <span className="inline-block w-1 h-3.5 bg-primary rounded-full" />
                  코스 타입{' '}
                  <span className="caption-r text-secondary-5">
                    (중복 가능)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COURSE_TYPE_OPTIONS.map(({ data, label }) => (
                    <button
                      key={data}
                      onClick={() => toggleCourseType(data)}
                      className={cn(
                        'px-3 py-2 rounded-xl caption-m transition-colors border',
                        courseTypes.includes(data)
                          ? 'bg-primary text-fg-inverse border-transparent'
                          : 'bg-secondary-3 text-secondary-5 border-secondary-4'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !difficulty}
                className="w-full py-4 rounded-2xl bg-primary text-fg-inverse body-b disabled:opacity-50"
              >
                {isSubmitting ? '제출 중...' : '완료'}
              </button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
