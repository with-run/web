import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FreeRunMap } from './FreeRunMap';
import { RunCharacter, WatchRunStatusNotice } from '@/shared/components';
import { useBridgeDataStore } from '@/bridge';
import { createRunningSession } from '@/apis';
import { useFreeRunSessionStore } from '@/stores/FreeRun';
import { startWatchRunSync } from '@/shared/utils/watchRunBridge';

export function FreeRunScreen() {
  const navigate = useNavigate();
  const gpsLocation = useBridgeDataStore((s) => s.gpsLocation);
  const setSession = useFreeRunSessionStore((s) => s.setSession);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // state 업데이트 비동기 사이 중복 호출 방지 (동기 가드)
  const calledRef = useRef(false);

  const handleStartRunning = async (latitude: number, longitude: number) => {
    setError(null);
    try {
      const res = await createRunningSession({
        mode: 'FREE',
        startLatitude: latitude,
        startLongitude: longitude,
      });
      await startWatchRunSync({
        runningSessionId: res.data.runningSessionId,
        mode: 'FREE',
        courseCoordinates: [{ latitude, longitude }],
      });
      setSession(res.data);
      navigate('/free-run-session');
    } catch {
      setError('서버 연결에 실패했습니다. 다시 시도해주세요.');
    } finally {
      // 웹에서도 테스트할 수 있어야 하기 때문
      calledRef.current = false;
      setIsStarting(false);
    }
  };

  // GPS 소스 분기 진입점
  // 중복 호출도 방지
  const handleClick = () => {
    if (calledRef.current) return;
    calledRef.current = true;
    setIsStarting(true);

    if (gpsLocation) {
      handleStartRunning(gpsLocation.latitude, gpsLocation.longitude);
      return;
    }

    // Bridge GPS 없으면 브라우저 위치 API로 폴백 (3초 타임아웃)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => handleStartRunning(coords.latitude, coords.longitude),
      (err) => {
        // code 1: PERMISSION_DENIED / 2: POSITION_UNAVAILABLE / 3: TIMEOUT
        if (err.code === 3) {
          // 타임아웃: 서울 기본 좌표로 fallback (데스크탑 WiFi 위치 조회 불안정)
          handleStartRunning(37.5665, 126.978);
          return;
        }
        calledRef.current = false;
        setIsStarting(false);
        setError('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
      },
      { timeout: 20000 }
    );
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <FreeRunMap />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-sticky">
        {error && (
          <p className="mb-4 body-r text-center text-red-400 px-6">{error}</p>
        )}
        <RunCharacter disabled={isStarting} onClick={handleClick} />
        <WatchRunStatusNotice className="mt-5 w-[min(92vw,360px)]" />
      </div>
    </div>
  );
}
