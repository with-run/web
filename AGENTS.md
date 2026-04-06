# WEB MODULE GUIDE

Scope: web-specific rules only. Follow `../AGENTS.md` for shared repo workflow and cross-project boundaries.

## OVERVIEW
`web/` is the primary product UI: Vite + React 19 + TypeScript, mobile-first, with routing in `src/routes/` and screen ownership in `src/features/`.

## STRUCTURE
```text
web/
├── src/main.tsx          # Boot entry: providers, app mount, startup failures start here
├── src/App.tsx           # App orchestration root: router/bootstrap/bridge sync before screens
├── src/routes/           # Navigation policy layer: public/private/layout decisions
├── src/pages/            # Thin route adapters; usually not the real screen owner
├── src/features/         # Real product flows and screen-local UI/state ownership
├── src/shared/           # Cross-feature foundation: tokens, primitives, layouts, utilities
├── src/bridge/           # Web-side consumer of the native bridge contract
├── src/apis/             # Backend-facing domain clients and request seams
└── docs/                 # High-signal implementation notes and troubleshooting references
```

Navigate this module by ownership, not by URL file. In most cases `pages/` points at `features/`, and `routes/` decides access while `features/` owns behavior.

## WHERE TO LOOK
- New screen behavior or screen-local state: `src/features/<Feature>/` — this is the normal screen owner
- URL access, auth gating, redirect flow, or layout choice: `src/routes/`
- Page file looks too thin to matter: check `src/pages/` first, then jump to its `features/` import
- Shared shell, app chrome, or reusable UI: `src/shared/components/`, `src/shared/layouts/`
- Token, typography, shadcn, or global styling work: `src/shared/styles/`
- API contract or request/response mapping changes: `src/apis/<domain>/`
- Native bridge usage on web: `src/bridge/` — but type/shape changes must be checked against `../mobile/src/bridge/types.ts`

## CONVENTIONS
- `@/*` is a real alias to `src/*`.
- `@bridge` points to `../mobile/src/bridge/types.ts`; bridge contract edits are cross-project changes.
- `pages/` are mostly thin wrappers. Put real UI and workflow logic in `features/`.
- Barrel exports are intentional. Avoid importing a file through its own barrel from the same folder.
- Feature and domain folders are commonly PascalCase (`Onboarding`, `GhostRun`, `RunningPreferences`, `UserProfile`); do not force kebab-case here.
- Build is typecheck-first: `pnpm build` runs `tsc -b && vite build`.

## STYLING RULES
- Use semantic HSL token variables, not raw hex/RGB values.
- Route shadcn styling through `src/shared/styles/shadcn.css`.
- Preserve Tailwind v4 token wiring in `src/shared/styles/index.css`.
- Keep `Pretendard Variable` as the base UI font unless a token-level typography change is intentional.

## ANTI-PATTERNS
- Do not move product UI into `mobile/` unless the work is truly native.
- Do not treat `src/pages/` as the real screen owner; it is mostly a route seam.
- Do not use case-mismatched imports; Linux CI-sensitive paths matter here.
- Do not do case-only renames outside a two-step `git mv` flow.
- Do not bypass tokens for quick visual matching.
- Do not edit only `web/src/bridge/` when bridge payload shapes change; the contract is mobile-owned.
- Do not keep stale `userId`/`MOCK_USER_ID` assumptions in new auth-aware flows.

## COMMANDS
```bash
cd web && pnpm install
cd web && pnpm dev
cd web && pnpm lint
cd web && pnpm build
cd web && pnpm build:staging
cd web && pnpm build:prod
```

## NOTES
- `web/Dockerfile` builds from the repo root because it copies `mobile/src/bridge`.
- `web/docs/` contains high-signal implementation references for bridge behavior, tokens, case-sensitive imports, and Android Expo edge cases.
