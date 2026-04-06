# Onboarding Rive Character 적용 가이드

이 문서는 `/Users/ino/Downloads/withrun_character.riv` 파일을 온보딩 캐릭터에 붙이는 가장 단순한 방법을 정리한 문서입니다.

이번 목표는 하나입니다.

- 캐릭터가 계속 `running` 상태로만 보이게 하기

즉, 이번 단계에서는:

- `intro`, `login`, `form`에 따라 Rive 내부 상태를 바꾸지 않습니다.
- `State Machine 1`도 연결하지 않습니다.
- `running` 애니메이션만 계속 재생합니다.

## 현재 프로젝트에서 바꿀 파일

- 캐릭터 컴포넌트: [OnboardingCharacter.tsx](/Users/ino/S14P21D202/web/src/features/Onboarding/OnboardingCharacter.tsx)
- 로그인 화면 사용처: [LoginScreen.tsx](/Users/ino/S14P21D202/web/src/features/Auth/LoginScreen.tsx)
- 온보딩 화면 사용처: [OnboardingScreen.tsx](/Users/ino/S14P21D202/web/src/features/Onboarding/OnboardingScreen.tsx)

실제로 수정이 필요한 파일은 거의 [OnboardingCharacter.tsx](/Users/ino/S14P21D202/web/src/features/Onboarding/OnboardingCharacter.tsx) 하나입니다.

## Rive 파일에서 지금 쓸 정보

스크린샷 기준으로 확인된 정보는 아래와 같습니다.

- Artboard: `main`
- Animation: `running`
- State Machine: `State Machine 1`

하지만 이번 단계에서는 `State Machine 1`은 쓰지 않습니다.

이번에는 아래 두 개만 씁니다.

- `main`
- `running`

## Step 1. Rive 파일을 프로젝트 안으로 옮기기

`.riv` 파일은 `public`에 두는 게 가장 단순합니다.

추천 경로:

- `/Users/ino/S14P21D202/web/public/rive/withrun_character.riv`

복사 명령:

```bash
mkdir -p /Users/ino/S14P21D202/web/public/rive
cp /Users/ino/Downloads/withrun_character.riv /Users/ino/S14P21D202/web/public/rive/withrun_character.riv
```

복사 후 브라우저에서 접근하는 경로는 아래처럼 됩니다.

```txt
/rive/withrun_character.riv
```

## Step 2. Rive React 런타임 설치

웹에서는 `@rive-app/react-canvas`를 쓰면 가장 무난합니다.

```bash
cd /Users/ino/S14P21D202/web
pnpm add @rive-app/react-canvas
```

## Step 3. 캐릭터 파일을 Rive로 교체하기

지금 [OnboardingCharacter.tsx](/Users/ino/S14P21D202/web/src/features/Onboarding/OnboardingCharacter.tsx)는 임시 JSX 캐릭터를 직접 그리는 구조입니다.

이 파일 안에서:

1. 기존 JSX 사람 캐릭터를 제거하고
2. Rive 컴포넌트를 렌더링하도록 바꾸면 됩니다.

핵심은 아래 설정입니다.

- `src: '/rive/withrun_character.riv'`
- `artboard: 'main'`
- `animations: 'running'`
- `autoplay: true`

즉, state machine이 아니라 animation 하나만 직접 재생하는 방식입니다.

## Step 4. 코드 예시

아래처럼 바꾸면 됩니다.

```tsx
import { useRive } from '@rive-app/react-canvas';
import { motion } from 'motion/react';

type OnboardingCharacterProps = {
  state: OnboardingCharacterState;
};

type OnboardingCharacterState = 'intro' | 'login' | 'form';

export function OnboardingCharacter({ state }: OnboardingCharacterProps) {
  const containerVariants = {
    intro: { y: 64, scale: 0.62 },
    login: { y: 28, scale: 0.62 },
    form: { y: 88, scale: 0.62 },
  };

  const { RiveComponent } = useRive({
    src: '/rive/withrun_character.riv',
    artboard: 'main',
    animations: 'running',
    autoplay: true,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="intro"
      animate={state}
      className="relative z-10 flex flex-col items-center justify-center"
    >
      <div className="relative h-64 w-40">
        <RiveComponent className="h-full w-full" />
      </div>
    </motion.div>
  );
}
```

## Step 5. 왜 이렇게 하는지

이 방식이 가장 쉬운 이유는 아래와 같습니다.

- `running` 애니메이션만 바로 재생할 수 있습니다.
- `State Machine 1` input을 몰라도 됩니다.
- `intro/login/form`별 상태 연결 작업이 없습니다.
- 현재 레이아웃 구조를 거의 안 건드립니다.

정리하면:

- React의 `state`는 위치와 크기만 바꿉니다.
- Rive는 항상 `running`만 재생합니다.

## Step 6. 확인할 것

적용 후에는 아래만 확인하면 됩니다.

1. 로그인 화면에서 캐릭터가 보이는지
2. 온보딩 화면에서 캐릭터가 보이는지
3. 캐릭터가 계속 달리는 애니메이션으로 나오는지
4. 캐릭터가 너무 크거나 작지 않은지

크기가 안 맞으면 먼저 아래 wrapper 크기를 조정하면 됩니다.

```tsx
<div className="relative h-64 w-40">
```

예를 들어 더 크게 보이게 하려면 `h-72 w-44`처럼 조정하면 됩니다.

## Step 7. 이번 단계에서 하지 않는 것

이번에는 아래 작업은 하지 않습니다.

- `State Machine 1` 연결
- input 추가
- `intro/login/form`별 애니메이션 분기
- React에서 Rive 상태 제어

즉, 이번 단계는 정말 단순하게:

- 파일 복사
- 패키지 설치
- `OnboardingCharacter.tsx` 교체
- `running`만 재생

여기까지만 하면 됩니다.

## 나중에 필요해지면

나중에 화면별로 다른 동작이 필요해지면 그때 아래로 확장하면 됩니다.

- `State Machine 1` 사용
- input 추가
- `intro/login/form`에 따라 Rive 내부 상태 전환

하지만 지금 목표가 "계속 달리는 캐릭터 하나 붙이기"라면, 이번 문서의 방식이 가장 적절합니다.
