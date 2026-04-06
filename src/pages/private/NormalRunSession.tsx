import { useParams } from 'react-router-dom';

import { NormalRunSessionScreen, NormalRunResultScreen } from '@/features/NormalRun';
import { useNormalRunCourseDetail } from '@/hooks/NormalRun/useNormalRunCourseDetail';
import { useNormalRunSessionStore } from '@/stores/NormalRun';

export function NormalRunSessionPage() {
  const { courseId } = useParams();
  const { courseDetail, isLoading, error } = useNormalRunCourseDetail(
    courseId ? Number(courseId) : undefined
  );
  const result = useNormalRunSessionStore((s) => s.result);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="body-l text-fg-secondary">
          코스 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (error || !courseDetail) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="body-l text-fg-secondary">
          코스를 찾을 수 없습니다.
        </p>
      </div>
    );
  }

  if (result) {
    return <NormalRunResultScreen result={result} />;
  }

  return <NormalRunSessionScreen courseDetail={courseDetail} />;
}
