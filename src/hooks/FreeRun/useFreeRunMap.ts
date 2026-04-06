import { useEffect, useRef } from 'react';

import { MAP_DEFAULT_CENTER } from '@/shared/constants/map';
import { loadKakaoMapSdk } from '@/shared/libs';

export function useFreeRunMap() {
  // useRef: 화면을 다시 그리지 않고 값을 저장하는 상자
  // useState랑 다르게 값이 바뀌어도 리렌더링이 안 됨.

  // 지도를 그릴 DOM 요소 참조 (div 태그 안에 지도 그리기 위함)
  const containerRef = useRef<HTMLDivElement>(null);
  // 카카오 Map 인스턴스 (지도의 객체를 저장하고, "지도 중심 이동" 같은 명령을 내릴 때 사용)
  const mapRef = useRef<kakao.maps.Map | null>(null);
  // 현재 위치 마커 (지도 위에 찍힌 마커 객체 저장 ("마커 위치 옮겨" 같은 명령을 내릴 때 사용))
  const markerRef = useRef<kakao.maps.Marker | null>(null);

  // 1. 서울 기본 좌표로 카카오 지도 생성
  // 2. 기본 위치에 마커 찍기
  // 3. navigator.geolocation.getCurrentPosition으로
  //    현재 위치 받아와서 지도 중심 이동 및 마커 위치 업데이트
  // useEffect: 컴포넌트가 화면에 나타난 직후 딱 한 번 실행되는 코드 블록
  useEffect(() => {
    // div 태그가 DOM에 없으면 중단
    if (!containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;
    // watchPosition ID를 useEffect 스코프에 선언해야 cleanup에서 접근 가능
    let watchId: number;

    loadKakaoMapSdk().then(() => {
      if (cancelled) return;

      // 1. 서울 좌표로 지도 생성
      const kakaoCenter = new kakao.maps.LatLng(
        MAP_DEFAULT_CENTER.lat,
        MAP_DEFAULT_CENTER.lng
      );
      mapRef.current = new kakao.maps.Map(container, { center: kakaoCenter, level: 3 });
      markerRef.current = new kakao.maps.Marker({ position: kakaoCenter });
      markerRef.current.setMap(mapRef.current);

      const moveToLocation = (coords: GeolocationCoordinates) => {
        const latLng = new kakao.maps.LatLng(coords.latitude, coords.longitude);
        mapRef.current?.setCenter(latLng);
        markerRef.current?.setPosition(latLng);
      };

      // 2. 캐시된 위치 즉시 사용 (30초 이내) → 재방문 시 서울로 튀는 현상 방지
      // enableHighAccuracy: false → WiFi/기지국 기반이라 빠르게 응답
      // [자유 화면을 30초 이내로 재방문: 서울 표시 -> getCurrentPosition(캐시 있음 -> 즉시)
      // -> 떠난 시점 위치로 이동 -> watchPosition(실시간 GPS 추적 시작)
      // -> 현재 이동 위치로 업데이트]
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => moveToLocation(coords),
        () => {},
        { enableHighAccuracy: false, maximumAge: 30000 },
      );

      // 3. 정확한 GPS 위치로 업데이트 + 이동 추적
      // enableHighAccuracy: true → GPS 칩 사용 (정확하지만 응답이 느림)
      watchId = navigator.geolocation.watchPosition(
        ({ coords }) => moveToLocation(coords),
        () => {},
        { enableHighAccuracy: true },
      );
    });

    // 페이지 벗어날 때 반드시 해제 (배터리 소모 방지)
    // useEffect의 return이어야 React가 cleanup을 실행함
    // [다른 탭으로 이동: useEffect cleanup 실행 → watchPosition 해제 → GPS 추적 중단]
    return () => {
      cancelled = true;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 내부 훅인 mapRef, markerRef를 제외한 containerRef은
  // 지도 프레임이기에 <div ref={containerRef}> 로 연결하면 끝
  return { containerRef };
}
