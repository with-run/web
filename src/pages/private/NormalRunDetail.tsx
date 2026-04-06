import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { NormalRunDetailScreen } from '@/features/NormalRun';
import { useNormalRunCourseDetail } from '@/hooks/NormalRun/useNormalRunCourseDetail';
import { loadKakaoMapSdk } from '@/shared/libs';

export function NormalRunDetailPage() {
  // API 호출과 병렬로 SDK 미리 로드
  useEffect(() => { loadKakaoMapSdk(); }, []);

  const { courseId } = useParams();
  const { courseDetail, isLoading, error } = useNormalRunCourseDetail(
    courseId ? Number(courseId) : undefined
  );

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

  return <NormalRunDetailScreen course={courseDetail} />;
}
