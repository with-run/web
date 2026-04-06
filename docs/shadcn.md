# shadcn/ui 가이드

> 이 문서는 shadcn/ui를 처음 접하는 주니어 개발자를 위해
> 개념부터 실제 트러블슈팅까지 정리한 학습용 문서입니다.

---

## 목차

1. [shadcn/ui란?](#1-shadcnui란)
2. [컴포넌트 추가 방법](#2-컴포넌트-추가-방법)
3. [components.json 구조](#3-componentsjson-구조)
4. [alias 설정과 tsconfig](#4-alias-설정과-tsconfig)
5. [shadcn과 디자인 토큰 연동 구조](#5-shadcn과-디자인-토큰-연동-구조)
6. [Tailwind v4 연동 — @theme inline](#6-tailwind-v4-연동--theme-inline)
7. [폰트 설정 — Pretendard](#7-폰트-설정--pretendard)
8. [ESLint 경고 처리](#8-eslint-경고-처리)
9. [트러블슈팅 모음](#9-트러블슈팅-모음)

---

## 1. shadcn/ui란?

shadcn/ui는 **설치하는 컴포넌트 라이브러리가 아닙니다.**

일반적인 UI 라이브러리(MUI, Ant Design 등)는 `npm install` 후 `import`해서 사용합니다.
shadcn은 다릅니다 — **컴포넌트 소스 코드를 프로젝트에 직접 복사**해 줍니다.

```
일반 라이브러리        shadcn
─────────────         ──────────────────────────
node_modules에 존재   src/shared/components/shadcn/ 에 존재
수정 불가             자유롭게 수정 가능
업데이트 쉬움         업데이트는 직접 관리
```

### 왜 이렇게 만들었나?

컴포넌트를 직접 소유하면 디자인을 100% 커스터마이징할 수 있습니다.
라이브러리 스타일을 억지로 덮어쓰는 `:global` 해킹 없이도요.

---

## 2. 컴포넌트 추가 방법

### CLI 사용 (권장)

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card input dialog
```

CLI가 한 번에 처리하는 것들:
- 컴포넌트 파일 생성 (`src/shared/components/shadcn/button.tsx`)
- 필요한 npm 패키지 자동 설치 (`class-variance-authority`, `radix-ui` 등)
- import 경로를 `components.json` alias 기준으로 자동 설정

### 파일 직접 복붙 (비권장)

shadcn 공식 사이트에서 코드를 복사해 붙여넣을 수 있지만,
**의존성 패키지는 직접 설치해야 합니다.**

```bash
# button.tsx를 복붙한 경우 수동으로 설치 필요
pnpm add class-variance-authority radix-ui
```

> CLI 사용을 강력히 권장합니다. 의존성 누락으로 인한 오류를 예방할 수 있습니다.

---

## 3. components.json 구조

shadcn CLI의 설정 파일입니다. 프로젝트 루트에 위치합니다.

```json
{
  "style": "new-york",
  "tsx": true,
  "tailwind": {
    "css": "src/shared/styles/shadcn.css",  ← shadcn CSS 변수가 있는 파일
    "cssVariables": true                     ← CSS 변수 방식 사용 여부
  },
  "aliases": {
    "ui":         "@/shared/components/shadcn",  ← 컴포넌트 저장 위치
    "utils":      "@/shared/utils/shadcn",       ← cn() 유틸 위치
    "components": "@/shared/components/shadcn",
    "lib":        "@/shared/libs/shadcn",
    "hooks":      "@/shared/hooks/shadcn"
  }
}
```

### aliases가 하는 일

컴포넌트 파일 내부의 import 경로를 결정합니다.

```tsx
// CLI가 생성한 button.tsx — aliases.utils 값이 자동으로 들어감
import { cn } from "@/shared/utils/shadcn"
```

---

## 4. alias 설정과 tsconfig

### 문제 상황

`components.json`에서 `@/shared/...` 형태로 경로를 쓰려면
shadcn CLI가 `@`를 `src/`로 해석할 수 있어야 합니다.

shadcn CLI는 **`tsconfig.json`의 `paths`** 를 읽어서 alias를 해석합니다.

### 이 프로젝트의 구조

```
tsconfig.json       ← shadcn CLI, ESLint 등 도구가 읽는 파일
tsconfig.app.json   ← TypeScript 컴파일러가 실제 사용하는 파일
```

Vite 프로젝트는 `tsconfig.json`이 `references`만 가진 "목록 파일"이고,
실제 설정은 `tsconfig.app.json`에 있습니다.
shadcn CLI는 `references`를 따라가지 않으므로, **루트 `tsconfig.json`에도 `paths`를 추가해야 합니다.**

```json
// tsconfig.json
{
  "references": [...],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]   ← shadcn CLI가 이 파일을 읽음
    }
  }
}
```

```json
// tsconfig.app.json (TypeScript 컴파일러용, 기존과 동일하게 유지)
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

> 두 파일에 중복으로 두는 것이 맞습니다. 역할이 다르기 때문입니다.

---

## 5. shadcn과 디자인 토큰 연동 구조

### shadcn이 색상을 쓰는 방식

shadcn 컴포넌트는 색상 값을 직접 갖지 않고 CSS 변수를 참조합니다.

```tsx
// button.tsx 내부 — 색상 값 없이 변수만 참조
"bg-primary text-primary-foreground hover:bg-primary/90"
```

이 변수들의 기본값은 shadcn 설치 시 자동 생성됩니다.
우리 브랜드 색으로 바꾸려면 이 변수들을 덮어써야 합니다.

### 이 프로젝트의 3단계 브리지 구조

```
tokens/color.css          shadcn.css              @theme inline
────────────────          ──────────────          ─────────────────────
--primary-1:         →    --primary:         →    --color-primary:
  0 100% 62%               var(--primary-1)          hsl(var(--primary))
(원천 HSL 값)             (shadcn 변수 연결)         (Tailwind 클래스 생성)
                                                          ↓
                                                     bg-primary 클래스 ✅
```

### 왜 HSL 채널값을 사용하나?

shadcn 컴포넌트는 같은 색의 투명도 변형을 자주 사용합니다.

```css
/* HSL 채널값 분리 시 — 변수 하나로 투명도 조절 가능 */
--primary: 0 100% 62%;

background: hsl(var(--primary));        /* 불투명 */
background: hsl(var(--primary) / 90%); /* 90% 불투명 (hover 상태) */
background: hsl(var(--primary) / 50%); /* 반투명 */
```

### shadcn 변수 전체 매핑

| shadcn 변수 | 연결된 토큰 | 적용 컴포넌트 |
|---|---|---|
| `--primary` | `--primary-1` | Button default, Link |
| `--primary-foreground` | `--white` | 주 버튼 위 텍스트 |
| `--secondary` | `--secondary-6` | Button secondary |
| `--destructive` | `--error` | 삭제/위험 버튼 |
| `--muted` | `--surface-muted` | 비활성 배경 |
| `--muted-foreground` | `--text-secondary` | 보조 텍스트 |
| `--accent` | `--primary-5` | hover 배경 |
| `--border` | `--border-default` | 테두리 |
| `--ring` | `--border-focus` | 포커스 링 |
| `--radius` | `--radius-md` | 컴포넌트 기본 radius |

---

## 6. Tailwind v4 연동 — @theme inline

### 왜 필요한가?

Tailwind v4는 `bg-primary` 같은 유틸리티 클래스가 어떤 색인지 **스스로 알 수 없습니다.**
`:root`에 CSS 변수를 아무리 많이 정의해도, Tailwind가 인식하려면 `@theme`에 등록해야 합니다.

```css
/* ❌ 이것만으로는 bg-primary 클래스가 생성되지 않음 */
:root {
  --primary: 0 100% 62%;
}

/* ✅ @theme inline 등록 후 bg-primary 클래스 사용 가능 */
@theme inline {
  --color-primary: hsl(var(--primary));
}
```

### @theme vs @theme inline 차이

| 구분 | 동작 |
|---|---|
| `@theme` | CSS 변수 새로 생성 + 유틸리티 클래스 생성 |
| `@theme inline` | CSS 변수 생성 없이 값을 유틸리티 클래스에 직접 연결 |

우리는 이미 CSS 변수가 있으므로 `@theme inline`이 적합합니다.

### @layer base

body의 기본 배경색·텍스트 색을 적용합니다.

```css
@layer base {
  * {
    @apply border-border outline-ring/50;  /* 기본 테두리색, 포커스 링 */
  }
  body {
    @apply bg-background text-foreground;  /* body 배경·텍스트 */
  }
}
```

---

## 7. 폰트 설정 — Pretendard

### 설치

CDN 대신 npm 패키지를 사용합니다.

```bash
pnpm add pretendard
```

| 구분 | CDN | npm 패키지 |
|---|---|---|
| 속도 | 외부 네트워크 왕복 | 번들에 포함, 빠름 |
| 안정성 | CDN 장애 시 폰트 깨짐 | 영향 없음 |
| 오프라인 | 불가 | 가능 |

### CSS 설정

```css
/* index.css */
@import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
```

`dynamic-subset`: 페이지에 실제로 사용된 글자만 로드하는 최적화 버전입니다.

### Tailwind v4에서 기본 폰트 적용

Tailwind v4는 `--font-sans` 변수로 body 기본 폰트를 관리합니다.
`@layer base`에서 `font-family`를 설정해도 Tailwind 기본값에 덮어씌워집니다.
`@theme`에서 `--font-sans`를 직접 지정해야 합니다.

```css
@theme inline {
  --font-sans: 'Pretendard Variable', sans-serif;
  /* ... */
}
```

> **주의**: 패키지명은 `'Pretendard Variable'`입니다. `'Pretendard'`와 다릅니다.
> Variable font 파일의 실제 font-family 이름이 `Pretendard Variable`로 등록되어 있습니다.

---

## 8. ESLint 경고 처리

### 경고 메시지

```
Fast refresh only works when a file only exports components.
Use a new file to share constants or functions between components.
eslint(react-refresh/only-export-components)
```

### 원인

shadcn 컴포넌트는 컴포넌트와 스타일 변수를 함께 export합니다.

```ts
// button.tsx
export { Button, buttonVariants }
//       ↑컴포넌트  ↑상수 — 이 조합이 경고를 유발
```

`buttonVariants`는 다른 컴포넌트에서 버튼 스타일을 재사용하기 위한 **의도적 설계**입니다.

```tsx
// 다른 컴포넌트에서 버튼 스타일만 빌려 쓰는 예시
import { buttonVariants } from "@/shared/components/shadcn/button"
<Link className={buttonVariants({ variant: "outline" })}>링크</Link>
```

### 해결

`eslint.config.js`에서 `allowConstantExport` 옵션으로 경고를 허용합니다.

```js
rules: {
  'react-refresh/only-export-components': [
    'warn',
    { allowConstantExport: true },  ← 상수 export는 허용
  ],
},
```

> `rules` **안에** 넣어야 합니다. 바깥에 두면 ESLint가 인식하지 못합니다.

---

## 9. 트러블슈팅 모음

### ① @/ 경로를 쓴 alias가 적용 안 되고 @폴더가 생성됨

**원인**: shadcn CLI가 `tsconfig.json`의 `paths`를 못 찾아 `@`를 문자 그대로 해석

**해결**: 루트 `tsconfig.json`에 `compilerOptions.paths` 추가 ([4번 참고](#4-alias-설정과-tsconfig))

---

### ② `cn()` 함수를 import하는데 파일이 없음

**원인**: `cn()` 유틸은 `shadcn init` 시에만 자동 생성됨. 컴포넌트만 추가하면 생성 안 됨

**해결**: `src/shared/utils/shadcn.ts` 직접 생성

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```bash
pnpm add clsx tailwind-merge
```

---

### ③ 컴포넌트를 복붙했는데 `class-variance-authority` 모듈을 찾을 수 없음

**원인**: 파일 복붙은 의존성 패키지를 설치해주지 않음

**해결**:

```bash
pnpm add class-variance-authority
```

**재발 방지**: 앞으로는 `pnpm dlx shadcn@latest add <컴포넌트명>` 사용

---

### ④ CSS를 수정해도 화면에 반영이 안 됨 (HMR이 작동하지 않음)

**원인**: `index.css`의 `@import` 경로 중 하나가 잘못되어 Vite가 해당 CSS 모듈 전체를 무효화

```
브라우저 CSS  → @import 실패 시 해당 줄만 건너뜀 (계속 진행)
Vite 번들러   → @import 실패 시 CSS 모듈 전체 무효화, HMR 갱신 안 됨
```

**해결**: `@import` 경로를 정확히 확인

```css
/* ❌ 존재하지 않는 파일 */
@import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.min.css';

/* ✅ 올바른 파일명 */
@import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
```

---

### ⑤ shadcn 컴포넌트에 브랜드 색이 적용되지 않음

**원인 체크리스트**:

```
□ tokens/color.css에 HSL 채널값이 정의되어 있는가?
□ shadcn.css에서 --primary 등이 우리 토큰을 참조하는가?
□ index.css에 @theme inline 블록이 있는가?
□ @theme inline에 --color-primary 등이 정의되어 있는가?
□ index.css의 import 순서가 tokens → shadcn.css → @theme inline 순인가?
```

---

### ⑥ 폰트가 적용되지 않음

**원인**: Tailwind v4는 `--font-sans`로 body 폰트를 관리. `@layer base`에서 설정해도 Tailwind 기본값이 덮어씀

**해결**: `@theme inline`에서 `--font-sans` 지정

```css
@theme inline {
  --font-sans: 'Pretendard Variable', sans-serif;
}
```
