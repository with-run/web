import { Bookmark, Heart, MapPin } from 'lucide-react';
import type { MouseEvent } from 'react';

import { Badge } from '@/shared/components/shadcn/badge';
import { Button } from '@/shared/components/shadcn/button';
import { Card, CardContent } from '@/shared/components/shadcn/card';
import type { CourseItem } from '@/apis/course';

type RunningCourseCardProps = {
  course: CourseItem;
  isSaved: boolean;
  onClick?: () => void;
  onToggleSave: (courseId: number) => void;
};

export function RunningCourseCard({
  course,
  isSaved,
  onClick,
  onToggleSave,
}: RunningCourseCardProps) {
  function handleToggleSave(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    onToggleSave(course.courseId);
  }

  return (
    <Card
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className="overflow-hidden py-0 rounded-xl border-border-default bg-surface-default shadow-md"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={course.snapshotImageUrl || '/course-fallback.svg'}
          alt={course.title}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute left-5 top-5 z-raised">
          <Badge className="rounded-full bg-surface-default px-3 py-2 text-fg-primary">
            <MapPin
              size={14}
              className="mr-1 text-primary-1"
            />
            {(course.distanceM / 1000).toFixed(1)}km
          </Badge>
        </div>

        <div className="absolute right-5 top-5 z-raised">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleToggleSave}
            className="h-11 w-11 rounded-full border-border-default bg-surface-default text-fg-primary"
          >
            <Bookmark
              size={18}
              className={
                isSaved
                  ? 'fill-primary-1 text-primary-1'
                  : ''
              }
            />
          </Button>
        </div>
      </div>

      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="h3-b text-fg-primary">
            {course.title}
          </h3>

          <div className="flex items-center gap-1 text-primary-1">
            <Heart size={18} fill="currentColor" />
            <span className="body-l-b">
              {course.likeCount.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {course.difficulty != null && (
            <Badge
              variant="outline"
              className="rounded-full border-border-default bg-transparent px-3 py-1"
            >
              {course.difficulty.label}
            </Badge>
          )}
          <Badge
            variant="outline"
            className="rounded-full border-border-default bg-transparent px-3 py-1"
          >
            고도 {course.elevationGainM}m
          </Badge>
          {course.courseTypes.map((type) => (
            <Badge
              key={type.data}
              variant="outline"
              className="rounded-full border-primary-1/[0.25] bg-primary-1/[0.1] px-3 py-1 text-primary-1"
            >
              {type.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
