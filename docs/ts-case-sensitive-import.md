# TypeScript import 대소문자 불일치로 인한 CI 빌드 실패

## 증상

로컬(macOS)에서는 빌드가 정상 통과되지만, CI(Linux) 환경에서 아래 에러 발생:

```
error TS2307: Cannot find module '@/features/NormalRun' or its corresponding type declarations.
error TS7006: Parameter 'prev' implicitly has an 'any' type.
```

## 원인

macOS 파일 시스템은 **대소문자를 구분하지 않아** 경로가 달라도 같은 파일로 인식한다.
Linux 파일 시스템은 **대소문자를 구분하므로** 실제 폴더명과 import 경로가 정확히 일치해야 한다.

```
실제 폴더: src/features/NormalRun/
import 경로: @/features/NormalRun  ← 일치 → OK
import 경로: @/features/normalrun  ← 불일치 → CI 빌드 실패
```

또한 모듈을 찾지 못하면 해당 모듈에서 가져온 타입도 추론이 불가능해져 `implicit any` 에러가 연쇄적으로 발생한다.

## 추가 원인: 순환 참조

같은 barrel(`index.ts`)에 속한 파일이 자기 자신의 barrel을 import하면 순환 참조가 발생한다.

```ts
// NormalRun/NormalRunScreen.tsx (잘못된 예)
import { RunningCourseCard } from '@/features/NormalRun'; // 자기 자신의 barrel
```

## 해결 방법

### 1. 순환 참조 제거 — 상대 경로로 직접 import

```ts
// NormalRun/NormalRunScreen.tsx (수정 후)
import { RunningCourseCard, type RunningCourse, type RunningCourseTab } from './RunningCourseCard';
import { RunningFilterModal, type RunningFilterState } from './RunningFilterModal';
```

### 2. tsconfig에 대소문자 강제 옵션 추가

`tsconfig.app.json`에 아래 옵션을 추가하면 macOS에서도 대소문자 불일치를 에러로 감지한다.

```json
{
  "compilerOptions": {
    "forceConsistentCasingInFileNames": true
  }
}
```

## 예방

- import 경로는 항상 실제 파일/폴더명의 대소문자와 동일하게 작성한다.
- 같은 barrel 내의 파일끼리는 상대 경로로 import한다.
