# Android Expo 빌드 이슈 트러블슈팅

## 환경

- OS: Windows 11
- 패키지 매니저: pnpm
- 프레임워크: Expo (React Native 0.81.5)
- 프로젝트 경로: `C:\withrun_gitlab\mobile\`

---

## 이슈 1: ninja 경로 260자 초과

### 에러 메시지

```
ninja: error: Stat(C:/withrun_gitlab/mobile/node_modules/.pnpm/react-native-safe-area-cont_db7e84308fa9a28cdc0cc9a7b78f5e93/node_modules/react-native-safe-area-context/android/build/generated/source/codegen/jni/react/renderer/components/safeareacontext/safeareacontextJSI-generated.cpp): Filename longer than 260 characters
```

### 원인

pnpm의 기본 패키지 설치 방식은 `node_modules/.pnpm/<패키지명>_<해시>/node_modules/<패키지>/` 구조로 심링크를 생성한다.
이 중간 경로가 매우 길어 Windows의 경로 길이 제한(260자)을 초과한다.

**ninja**는 C++ 빌드 도구로, Android NDK가 내부적으로 사용한다. 2012년에 만들어진 오래된 도구라 Windows Long Path API를 지원하지 않아, 레지스트리에서 `LongPathsEnabled`를 설정해도 효과가 없다.

### 빌드 흐름

```
Expo CLI → Gradle → Android NDK → CMake → Ninja → C++ 컴파일
```

---

## 이슈 2: Gradle "No variants exist"

### 에러 메시지

```
Could not resolve project :react-native-safe-area-context.
No matching variant of project :react-native-safe-area-context was found.
  - No variants exist.
```

### 원인

`autolinking.json`이 이전 pnpm 설치 구조의 경로를 캐싱하고 있었다.
pnpm 설정을 바꾸고 재설치해도 아래 파일이 자동으로 갱신되지 않아 Gradle이 존재하지 않는 경로에서 라이브러리 프로젝트를 찾으려고 했다.

```
android/build/generated/autolinking/autolinking.json
```

캐싱된 경로 예시:
```
C:\withrun_gitlab\mobile\node_modules\.pnpm\react-native-safe-area-cont_...\node_modules\react-native-safe-area-context
```

---

## 이슈 3: Metro `metro-runtime` 모듈 못 찾음

### 에러 메시지

```
Error: Cannot find module 'metro-runtime/package.json'
```

### 원인

`virtual-store-dir=C:/pnpm-store`를 설정하면 패키지의 실제 파일이 프로젝트 외부(`C:/pnpm-store/...`)에 위치한다.
Node.js는 심링크를 따라 실제 경로 기준으로 모듈을 탐색하기 때문에, `@expo/cli`가 `C:/pnpm-store/...`에서 실행되면 프로젝트의 `node_modules/`에 있는 `metro-runtime`을 찾지 못한다.

---

## 최종 해결책

### `.npmrc` 설정

```ini
shamefully-hoist=true
node-linker=hoisted
```

- `node-linker=hoisted`: 패키지를 심링크 없이 `node_modules/<패키지>/`에 실제 파일로 설치한다. `.pnpm/<해시>/` 중간 경로가 사라져 경로가 대폭 단축된다.
- `shamefully-hoist=true`: 모든 패키지를 루트 `node_modules/`에 끌어올린다.

### 경로 길이 비교

| 방식 | 경로 예시 | 길이 |
|------|-----------|------|
| pnpm 기본 | `node_modules/.pnpm/react-native-safe-area-cont_<hash>/node_modules/.../safeareacontextJSI-generated.cpp` | 300자+ ❌ |
| `node-linker=hoisted` | `node_modules/react-native-safe-area-context/.../safeareacontextJSI-generated.cpp` | ~185자 ✅ |

### 적용 순서

```bash
# 1. .npmrc 수정 후 재설치
rm -rf node_modules
pnpm install

# 2. 모든 stale 캐시 삭제 (필수!)
rm -rf android/build android/app/build android/app/.cxx android/.gradle

# 3. 빌드
pnpm expo run:android --device
```

> **주의:** `pnpm install` 후 반드시 캐시를 삭제해야 한다. `autolinking.json`이 구버전 경로를 캐싱하고 있으면 "No variants exist" 에러가 발생한다.

---

## 시도했으나 실패한 방법들

| 방법 | 결과 | 실패 이유 |
|------|------|-----------|
| 레지스트리 `LongPathsEnabled=1` | ❌ | ninja가 Windows Long Path API 미지원 |
| `node-linker=hoisted` (캐시 미삭제) | ❌ | stale `autolinking.json` 캐시 |
| `virtual-store-dir=C:/pnpm-store` | ❌ | Metro가 프로젝트 외부 경로에서 peer dependency 탐색 실패 |
| `gradlew clean` | ❌ | 빌드 아웃풋만 삭제, `autolinking.json` 미삭제 |
