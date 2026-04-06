# Watch → Mobile → Web 브릿지 트러블슈팅

## 증상

워치에서 Send 버튼을 눌러도 웹에서 아무 반응이 없음.
워치에서는 "메시지 전송 완료!" 토스트가 정상 출력됨.

## 통신 파이프라인

```
워치 앱 (Kotlin)
  └─ Wearable.getMessageClient.sendMessage("/watch-to-phone", ...)
       └─ WatchListenerService.onMessageReceived()          [Android Native]
            └─ WatchBridgeModule.emitToJs()                 [Android Native]
                 └─ NativeEventEmitter → "WatchMessage"     [React Native JS]
                      └─ postMessage("watchMessage", {...}) [React Native JS]
                           └─ bridge.addEventListener()     [Web]
                                └─ alert(message)           [Web]
```

---

## 원인: Wearable Data Layer 인증서 불일치

### 에러 로그 (Logcat)

```
W WearableService: Mismatched certificate: AppKey[<hidden#...>, ...]
W WearableService: Failed to deliver message to AppKey[...]; Event[...: onMessageReceived, event=.../watch-to-phone, ...]
```

### 원인 설명

Wearable Data Layer API는 **같은 `applicationId`를 가진 앱끼리만 통신을 허용**하며,
추가로 **동일한 서명 인증서(keystore)** 로 서명된 경우에만 메시지를 전달한다.

이 프로젝트에서는:
- 폰 앱(Expo/RN): `mobile/android/app/debug.keystore` (Expo가 자체 생성한 키)
- 워치 앱(Android Studio): `~/.android/debug.keystore` (Android 기본 키)

두 앱이 **서로 다른 debug keystore**로 서명되어 있었기 때문에 GMS(Google Mobile Services)가 메시지 전달을 거부했다.

---

## 해결 방법

워치 앱의 `build.gradle`에 `signingConfigs`를 추가해 폰 앱과 동일한 keystore를 사용하도록 설정한다.

### `watch/app/build.gradle`

```groovy
android {
    signingConfigs {
        debug {
            // 폰 앱(Expo)과 동일한 키스토어 사용 → Wearable Data Layer 인증서 일치 필수 조건
            storeFile file('../../mobile/android/app/debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        // ...
    }
}
```

변경 후 워치 앱을 **다시 빌드해서 기기에 설치**하면 정상 동작한다.

---

## 디버깅 방법

각 단계에 로그를 추가해 어느 구간에서 끊기는지 확인한다.

### 1. Logcat으로 Native 레이어 확인

```bash
# 기기 목록 확인
adb devices

# 특정 기기 로그 필터링
adb -s <시리얼번호> logcat -s WatchBridge

# 더 넓은 범위로 확인
adb -s <시리얼번호> logcat | grep -iE "WatchBridge|WatchListener|wearable|watch-to-phone"
```

### 2. 단계별 로그 포인트

| 단계 | 위치 | 정상 로그 |
|------|------|-----------|
| [1] | `WatchListenerService.onMessageReceived` | `path=/watch-to-phone` |
| [2] | `WatchListenerService` | `메시지 수신 완료: hello from watch` |
| [3] | `WatchBridgeModule.emitToJs` | `appContext=있음`, `emit 완료` |
| [4] | `useWatchBridge` (JS) | `WatchMessage 이벤트 수신` |
| [5] | `WebViewScreen` (JS) | `postMessage → 웹으로 전송` |
| [6] | `home.tsx` (Web) | `watchMessage 수신` |

### 3. 단계별 트리아지

| 현상 | 원인 |
|------|------|
| `[1]` 로그 없음 | `WatchListenerService`가 호출되지 않음 → 인증서 불일치 or Wearable 연결 문제 |
| `[3]` appContext=null | 앱이 초기화되기 전에 서비스가 실행됨 (타이밍 문제) |
| `[3]` 이후 JS 로그 없음 | New Architecture 이벤트 에미터 호환 문제 |
| `[5]` 이후 웹 로그 없음 | WebView 브릿지 미연결 (웹뷰 로딩 전 postMessage 호출) |

---

## 주의사항

- `applicationId`는 폰 앱과 워치 앱이 반드시 동일해야 한다 (`com.mobile`)
- debug keystore 경로는 상대 경로로 작성되므로 프로젝트 구조가 바뀌면 수정 필요
- 폰과 워치가 **같은 Wi-Fi**에 연결되어 있어야 Wearable Data Layer가 동작한다
