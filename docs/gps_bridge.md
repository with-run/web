# 모바일 GPS → 웹 실시간 전달

## 개요

모바일(Expo)의 GPS를 1초 간격으로 수신해 WebView 브릿지를 통해 웹에 실시간 전달한다.

## 파이프라인

```
모바일 expo-location
  └─ useGpsLocation (hook)
       └─ postMessage('gpsLocation', { latitude, longitude, accuracy })
            └─ bridge.addEventListener('gpsLocation', ...)   [Web]
                 └─ useState → 화면에 텍스트 출력
```

## 관련 파일

| 파일 | 역할 |
|------|------|
| `mobile/src/hooks/useGpsLocation.ts` | `expo-location`으로 GPS 구독, 콜백 호출 |
| `mobile/src/bridge/bridge.ts` | `gpsLocation` 이벤트 스키마 등록 |
| `mobile/src/screens/webview/WebViewScreen.tsx` | `useGpsLocation` 연결 → `postMessage` 전송 |
| `web/src/pages/private/home.tsx` | `gpsLocation` 수신 → 위도/경도/정확도 표시 |

## GPS 설정

`useGpsLocation.ts`의 `watchPositionAsync` 옵션:

| 옵션 | 값 | 설명 |
|------|----|------|
| `accuracy` | `High` | 고정밀 GPS |
| `timeInterval` | 1000ms | 최소 업데이트 간격 |
| `distanceInterval` | 1m | 최소 이동 거리 |

## 권한

Android: 앱 첫 실행 시 위치 권한 팝업 자동 요청 (`ACCESS_FINE_LOCATION`)
권한 거부 시 GPS 수신 불가 (웹에 `-` 표시)
