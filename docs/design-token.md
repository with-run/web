# 디자인 토큰 가이드

> 이 문서는 디자인 토큰의 개념부터 shadcn 커스터마이징 방법까지,
> 이 프로젝트의 스타일 시스템을 처음 접하는 개발자를 위해 작성되었습니다.

---

## 목차

1. [디자인 토큰이란?](#1-디자인-토큰이란)
2. [이 프로젝트의 토큰 구조](#2-이-프로젝트의-토큰-구조)
3. [shadcn과 디자인 토큰](#3-shadcn과-디자인-토큰)
4. [HSL 색상 표기법](#4-hsl-색상-표기법)
5. [이 프로젝트에서 shadcn 토큰을 커스텀한 방법](#5-이-프로젝트에서-shadcn-토큰을-커스텀한-방법)
6. [shadcn 토큰을 커스텀하는 다른 방법들](#6-shadcn-토큰을-커스텀하는-다른-방법들)
7. [자주 하는 실수](#7-자주-하는-실수)

---

## 1. 디자인 토큰이란?

디자인 토큰(Design Token)은 **색상, 폰트, 간격 같은 시각적 값에 이름을 붙인 변수**입니다.

### 왜 필요한가?

토큰 없이 스타일을 작성하면 이런 문제가 생깁니다.

```css
/* ❌ 토큰 없이 작성한 경우 */
.button    { background: #FF3B3B; }
.badge     { color: #FF3B3B; }
.highlight { border: 1px solid #FF3B3B; }
```

브랜드 색상이 `#FF3B3B`에서 `#E03131`로 바뀌면, 프로젝트 전체에서 `#FF3B3B`를 찾아 하나씩 바꿔야 합니다.

```css
/* ✅ 토큰을 사용한 경우 */
.button    { background: hsl(var(--primary-1)); }
.badge     { color: hsl(var(--primary-1)); }
.highlight { border: 1px solid hsl(var(--primary-1)); }
```

```css
/* tokens/color.css 한 곳만 수정 */
--primary-1: 0 74% 54%; /* 여기만 바꾸면 위 세 곳이 모두 반영됨 */
```

### 디자인 토큰의 역할

| 역할 | 설명 |
|---|---|
| **Single Source of Truth** | 모든 색상/간격의 원천이 한 곳에 있음 |
| **일관성 유지** | 같은 이름을 쓰면 항상 같은 값이 나옴 |
| **변경 용이성** | 토큰 값 하나만 바꾸면 전체 UI에 반영 |
| **의사소통 도구** | 디자이너와 개발자가 같은 이름으로 대화 가능 |

---

## 2. 이 프로젝트의 토큰 구조

```
src/shared/styles/
├── index.css            ← @import 통합 진입점
├── shadcn.css           ← shadcn 변수 브리지 (3번 참고)
└── tokens/
    ├── color.css        ← 색상 (Grayscale / Primary / Secondary / Semantic / Surface / Text / Border)
    ├── typography.css   ← 텍스트 스타일 (Heading / Body / Caption)
    ├── spacing.css      ← 간격 (--space-1 ~ --space-16)
    ├── radius.css       ← 모서리 곡률 (--radius-sm ~ --radius-full)
    ├── shadow.css       ← 그림자 (--shadow-sm ~ --shadow-xl)
    └── z-index.css      ← 레이어 순서 (--z-base ~ --z-tooltip)
```

### index.css의 import 순서

```css
/* 1. Tailwind */
@import 'tailwindcss';

/* 2. 원천 토큰 먼저 로드 */
@import './tokens/color.css';
@import './tokens/typography.css';
/* ... */

/* 3. shadcn 브리지는 원천 토큰이 로드된 뒤에 */
@import './shadcn.css';
```

> **순서가 중요한 이유**
> `shadcn.css`에서 `var(--primary-1)` 같은 우리 토큰을 참조하기 때문에,
> 원천 토큰이 먼저 선언되어 있어야 합니다.

---

## 3. shadcn과 디자인 토큰

### shadcn 컴포넌트가 색상을 쓰는 방식

shadcn은 컴포넌트를 설치할 때 스타일에 색상 값을 직접 쓰지 않습니다.
대신 `--primary`, `--background` 같은 **자체 CSS 변수**를 참조합니다.

```css
/* shadcn Button 컴포넌트 내부 (예시) */
.btn-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

이 변수들의 기본값이 shadcn 설치 시 자동 생성되는 `globals.css` (이 프로젝트에서는 `shadcn.css`)에 담깁니다.

```css
/* shadcn이 기본으로 제공하는 값 (예시) */
:root {
  --primary: 221.2 83.2% 53.3%; /* 파란색 */
}
```

우리 브랜드 색은 빨간색이므로, **이 변수를 우리 토큰으로 덮어씌워야** 합니다.

### 브리지(Bridge) 구조

```
tokens/color.css          shadcn.css                  shadcn 컴포넌트
─────────────────         ──────────────────          ─────────────────
--primary-1:              --primary:                  background:
  0 100% 62%;    →──────►   var(--primary-1);  →────►  hsl(var(--primary));
```

- `tokens/color.css` : 색상의 원천. 여기만 수정하면 됩니다.
- `shadcn.css` : 연결 다리. shadcn 변수 ↔ 우리 토큰을 이어줍니다.
- shadcn 컴포넌트 : 건드리지 않아도 자동으로 브랜드 색이 적용됩니다.

---

## 4. HSL 색상 표기법

### Hex vs HSL

개발자에게 익숙한 hex 코드와 shadcn이 사용하는 HSL을 비교해 봅니다.

| 구분 | 예시 | 특징 |
|---|---|---|
| **Hex** | `#FF3B3B` | Figma 기본 포맷, 직관적 |
| **RGB** | `rgb(255, 59, 59)` | 빨강/초록/파랑 채널 |
| **HSL** | `hsl(0, 100%, 62%)` | 색조/채도/명도 |

### HSL의 세 가지 요소

```
H  Hue        색조   0 ~ 360deg
              0 = 빨강, 120 = 초록, 240 = 파랑, 360 = 다시 빨강

S  Saturation 채도   0 ~ 100%
              0% = 회색(무채색), 100% = 가장 선명한 색

L  Lightness  명도   0 ~ 100%
              0% = 검정, 50% = 순수한 색, 100% = 흰색
```

예시로 브랜드 레드 `#FF3B3B`를 보면:

```css
hsl(0, 100%, 62%)
    ↑    ↑    ↑
    │    │    └── 명도 62% → 밝은 편
    │    └─────── 채도 100% → 매우 선명
    └──────────── 색조 0 → 빨강
```

### shadcn이 HSL을 쓰는 이유: 투명도 제어

CSS 변수와 HSL을 조합하면 **투명도를 변수 하나로 제어**할 수 있습니다.

```css
/* HSL 채널값만 변수에 저장 (hsl() 래퍼 없이) */
--primary: 0 100% 62%;

/* 사용할 때 */
background: hsl(var(--primary));           /* 불투명 */
background: hsl(var(--primary) / 50%);    /* 반투명 */
background: hsl(var(--primary) / 10%);    /* 거의 투명 */
```

hex를 사용했다면 투명도마다 새로운 값이 필요합니다.

```css
/* hex 방식 — 투명도마다 새 값 필요 */
background: #FF3B3B;    /* 불투명 */
background: #FF3B3B80;  /* 50% 투명 — 계산이 필요 */
background: #FF3B3B1A;  /* 10% 투명 — 계산이 필요 */
```

shadcn 컴포넌트 내부에서 hover, disabled 등 상태별로 같은 색의 투명도 변형이 많이 사용되기 때문에 HSL 방식을 채택했습니다.

### HSL의 장단점

**장점**

- 코드만 봐도 어떤 색인지 대략 파악 가능
  ```css
  color: hsl(120, 46%, 34%); /* → 초록 계열, 중간 채도, 어두운 편 */
  ```
- 투명도 변형이 변수 하나로 해결됨
- 색상 팔레트 설계 시 명도/채도만 조절하면 일관된 색조 유지 가능

**단점**

- Figma는 기본적으로 hex를 사용하므로 변환 작업이 필요
- 팀원 모두가 HSL에 익숙하지 않으면 가독성 저하
- 정밀한 색상 값을 직접 입력하기 어려움

### HSL 변환 방법

**브라우저 개발자 도구**
색상 피커에서 hex → HSL 전환 버튼을 클릭하면 즉시 변환됩니다.

**VSCode 익스텐션**
`Convert Color` 익스텐션 설치 후 hex 값 선택 → 명령 팔레트(Ctrl+Shift+P) → `Convert Color` 실행

**온라인 도구**
`hslpicker.com` 또는 `colordesigner.io` 에서 hex 입력 시 HSL 값 출력

**Figma 플러그인**
`Tokens Studio` 플러그인을 사용하면 Figma 변수를 HSL 포맷으로 export 가능 (변환 작업 자체가 사라짐)

---

## 5. 이 프로젝트에서 shadcn 토큰을 커스텀한 방법

**방법 A (이 프로젝트 채택): hex 대신 HSL 채널값으로 토큰 정의 후 브리지 레이어 사용**

```
tokens/color.css  →  shadcn.css  →  shadcn 컴포넌트
(원천 HSL 값)        (변수 매핑)      (자동 적용)
```

### Step 1. `tokens/color.css` — HSL 채널값으로 원천 정의

```css
:root {
  --primary-1: 0 100% 62%; /* #FF3B3B */
  --error:     0 65%  51%; /* #D32F2F */
  /* ... */
}
```

### Step 2. `shadcn.css` — shadcn 변수 ↔ 프로젝트 토큰 연결

```css
:root {
  --primary:     var(--primary-1);    /* shadcn Button 등에 자동 적용 */
  --destructive: var(--error);        /* shadcn 삭제 버튼 등에 자동 적용 */
  --ring:        var(--border-focus); /* 포커스 링 색상 */
  --radius:      var(--radius-md);    /* 컴포넌트 기본 radius */
  /* ... */
}
```

### Step 3. 추가 shadcn 컴포넌트 설치 시

컴포넌트를 새로 설치해도 `shadcn.css`의 매핑이 이미 되어 있으므로
별도 수정 없이 브랜드 색이 자동 적용됩니다.

### shadcn 변수 전체 매핑표

| shadcn 변수 | 연결된 토큰 | 설명 |
|---|---|---|
| `--background` | `--surface-default` | 페이지 배경 |
| `--foreground` | `--text-primary` | 기본 텍스트 |
| `--card` | `--surface-default` | 카드 배경 |
| `--card-foreground` | `--text-primary` | 카드 텍스트 |
| `--popover` | `--surface-default` | 팝오버 배경 |
| `--popover-foreground` | `--text-primary` | 팝오버 텍스트 |
| `--primary` | `--primary-1` | 주 버튼 배경 |
| `--primary-foreground` | `--white` | 주 버튼 위 텍스트 |
| `--secondary` | `--secondary-6` | 보조 버튼 배경 |
| `--secondary-foreground` | `--secondary-1` | 보조 버튼 텍스트 |
| `--muted` | `--surface-muted` | 비활성 배경 |
| `--muted-foreground` | `--text-secondary` | 비활성 텍스트 |
| `--accent` | `--primary-5` | hover 강조 배경 |
| `--accent-foreground` | `--primary-1` | 강조 배경 위 텍스트 |
| `--destructive` | `--error` | 삭제·위험 버튼 배경 |
| `--destructive-foreground` | `--white` | 삭제 버튼 텍스트 |
| `--border` | `--border-default` | 기본 테두리 |
| `--input` | `--border-default` | 인풋 테두리 |
| `--ring` | `--border-focus` | 포커스 링 |
| `--radius` | `--radius-md` | 기본 border-radius |

---

## 6. shadcn 토큰을 커스텀하는 다른 방법들

### 방법 B: shadcn 변수에 hex 직접 대입

```css
/* shadcn.css */
:root {
  --primary: #FF3B3B; /* hex 직접 대입 */
}
```

단, shadcn 컴포넌트 내부 코드가 `hsl(var(--primary))` 형태로 작성되어 있기 때문에
컴포넌트를 설치할 때마다 해당 부분을 `var(--primary)`로 수정해야 합니다.

- **장점**: 변환 작업 불필요, 직관적
- **단점**: 컴포넌트 코드 수동 수정 필요, 투명도 활용 불가

### 방법 C: Tailwind CSS theme 설정에서 덮어쓰기

`tailwind.config.ts`에서 shadcn 변수를 Tailwind 테마와 연결하는 방식입니다.
Tailwind 유틸리티 클래스(`bg-primary`, `text-primary` 등)와 shadcn 컴포넌트가 동시에 동일한 색을 참조하게 됩니다.

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--primary) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
      },
    },
  },
}
```

- **장점**: Tailwind 클래스와 shadcn이 완전히 통합됨
- **단점**: Tailwind 설정 파일 관리 필요

### 방법 D: Style Dictionary로 자동 변환 파이프라인 구축

Figma → JSON → CSS/TS/Android 포맷으로 자동 변환하는 방식입니다.
중·대규모 프로젝트에서 디자이너와 개발자가 함께 토큰을 관리할 때 사용합니다.

```
Figma Variables
    ↓ (Tokens Studio 플러그인으로 export)
tokens.json
    ↓ (Style Dictionary 빌드)
├── tokens.css      ← 웹 프로젝트용
├── tokens.ts       ← JS/TS에서 직접 참조용
└── tokens.xml      ← Android용
```

- **장점**: 디자이너 수정 사항이 코드에 자동 반영, 멀티플랫폼 지원
- **단점**: 초기 구축 비용이 높음, 소규모 프로젝트에는 과한 방식

---

## 7. 자주 하는 실수

### hsl() 래퍼를 이중으로 감싸는 경우

```css
/* ❌ 잘못된 사용 */
:root {
  --primary-1: hsl(0, 100%, 62%); /* 변수에 이미 hsl()이 포함 */
}
.button {
  background: hsl(var(--primary-1)); /* hsl(hsl(...)) 이 되어 버림 */
}

/* ✅ 올바른 사용 */
:root {
  --primary-1: 0 100% 62%; /* 채널값만 저장 */
}
.button {
  background: hsl(var(--primary-1)); /* hsl(0 100% 62%) */
}
```

### z-index 숫자를 직접 쓰는 경우

```css
/* ❌ 토큰 없이 숫자 직접 사용 */
.modal   { z-index: 500; }
.tooltip { z-index: 501; } /* 모달보다 1 높게... 라고 생각하지만 */

/* ✅ 토큰 사용 */
.modal   { z-index: var(--z-modal); }   /* 500 */
.tooltip { z-index: var(--z-tooltip); } /* 700, 명확한 의도 */
```

### 간격 값을 직접 쓰는 경우

```css
/* ❌ */
.card { padding: 16px; }

/* ✅ */
.card { padding: var(--space-4); } /* 16px, 토큰 이름으로 의도가 명확 */
```
