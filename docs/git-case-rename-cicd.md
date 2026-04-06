# 대소문자 rename이 CI 빌드 실패로 이어지는 문제

## 증상

로컬(macOS/Windows)에서는 빌드가 정상 통과되지만, GitLab CI(Linux Docker) 환경에서 아래 에러 발생:

```
error TS2307: Cannot find module '@/features/NormalRun' or its corresponding type declarations.
```

## 원인

macOS/Windows 파일 시스템은 대소문자를 구분하지 않는다.
VSCode나 Finder에서 폴더명을 `normalrun` → `NormalRun`으로 변경해도 OS가 변경으로 인식하지 않아 git index가 업데이트되지 않는다.

```
git index (실제 추적 경로): src/features/normalrun/
import 경로:               @/features/NormalRun    ← Linux에서 불일치 → 빌드 실패
```

Linux CI는 git index 기준으로 파일을 체크아웃하므로 `normalrun` 폴더가 생성되고, `NormalRun`을 찾는 import가 실패한다.

## 해결 방법

`git mv`를 임시 이름을 경유해 두 단계로 실행한다.

```bash
# 폴더 rename 예시
git mv src/features/normalrun src/features/NormalRunTemp
git mv src/features/NormalRunTemp src/features/NormalRun

# 확인
git ls-files src/features/
```

git index가 `NormalRun`으로 업데이트된 것을 확인한 후 커밋한다.

```
rename(web) : features/normalrun → features/NormalRun (git index 대소문자 수정)
```

> Claude Code를 사용 중이라면 `/git-case-rename` 스킬로 자동화할 수 있다.

## 왜 두 단계인가

macOS는 `normalrun`과 `NormalRun`을 같은 경로로 취급하므로 `git mv normalrun NormalRun`을 한 번에 실행하면 오류가 발생한다. 전혀 다른 이름을 경유해야 OS가 실제 이동으로 인식한다.

## 예방

- 파일/폴더 대소문자 rename 시 반드시 `git mv` 두 단계를 사용한다.
- `tsconfig.app.json`에 `forceConsistentCasingInFileNames: true`를 설정하면 import 경로 불일치를 로컬에서도 에러로 감지할 수 있다.