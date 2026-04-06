## 폴더구조

- feature 단위 폴더 분리 구조

```
src/
├── App.tsx
├── main.tsx
│
├── apis/
│ └── example-feature/
│ ├── index.ts
│ └── example.ts
│
├── hooks/
│ └── example-feature/
│ ├── index.ts
│ └── example.ts
│
├── stores/
│ └── example-feature/
│ ├── index.ts
│ └── example.ts
│
├── utils/
│ └── example-feature/
│ ├── index.ts
│ └── example.ts
│
├── features/
│ └── example-feature/
│ ├── components/
│ │ ├── index.ts
│ │ └── example.tsx
│ ├── types/
│ │ └── index.ts
│ └── index.ts
│
├── pages/
│ ├── public/
│ │ └── example.tsx
│ └── private/
│ └── example.tsx
│
├── routes/
│ └── example.tsx
│
└── shared/
├── apis/
│ ├── index.ts
│ └── example.ts
├── components/
│ ├── index.ts
│ └── example.tsx
├── hooks/
│ ├── index.ts
│ └── example.ts
├── stores/
│ ├── index.ts
│ └── example.ts
├── utils/
│ ├── index.ts
│ └── example.ts
├── types/
│ └── index.ts
└── styles/
└── example.css
```

| 폴더                                   | 역할                                  |
| -------------------------------------- | ------------------------------------- |
| `apis/`, `hooks/`, `stores/`, `utils/` | feature 단위 하위폴더로 분리 관리     |
| `features/example-feature/`            | UI 컴포넌트 + 해당 feature 타입 등    |
| `shared/`                              | feature 횡단 공용 코드                |
| `pages/`                               | public/private 라우트 페이지 컴포넌트 |
| `routes/`                              | 라우터 설정 파일                      |

## Barrel Export 전략 사용

### Barrel Export란?

- 폴더 내 여러 모듈을 index.ts 하나로 모아서 외부에 노출하는 패턴입니다.

없을 때:

```javascript
import { useAuth } from '../../hooks/example-feature/useAuth';
import { useProfile } from '../../hooks/example-feature/useProfile';
import { useSession } from '../../hooks/example-feature/useSession';
```

있을 때 — hooks/example-feature/index.ts:

```javascript
export { useAuth } from './useAuth';
export { useProfile } from './useProfile';
export { useSession } from './useSession';

// 외부에서 한 줄로 import
import { useAuth, useProfile, useSession } from '../../hooks/example-feature';
```

구조에서의 역할:

```
hooks/
└── example-feature/
├── index.ts ← 이 폴더의 공개 API (여기서만 export 결정)
├── useAuth.ts
├── useProfile.ts
└── useSession.ts
```

- 내부 파일 구조가 바뀌어도 import 경로는 그대로 유지

- 외부에 노출할 것과 내부 전용을 index.ts에서 명시적으로 구분 가능
