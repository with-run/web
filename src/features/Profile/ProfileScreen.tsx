import {
  LogOut,
  PencilLine,
  ShieldAlert,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useLogout } from '@/hooks/Auth';
import {
  deleteUserProfile,
  getUserProfile,
  type UserProfileResponse,
} from '@/apis/UserProfile';
import { Button } from '@/shared/components/shadcn/button';
import { useAuthStore } from '@/stores/Auth';
import { ProfileDeleteDialog } from './ProfileDeleteDialog';
import { ProfileEditDialog } from './ProfileEditDialog';
import { ProfileLogoutDialog } from './ProfileLogoutDialog';

type ProfileMetricChipProps = {
  label: string;
  value: string;
};

function createProfileState(): UserProfileResponse {
  const user = useAuthStore.getState().user;

  return {
    nickname: user?.nickname ?? null,
    birthDate: user?.birthDate ?? null,
    gender: user?.gender ?? null,
    height: user?.height ?? null,
    weight: user?.weight ?? null,
  };
}

function formatProvider(provider: string | null | undefined): string {
  if (provider === 'kakao') {
    return 'Kakao';
  }

  if (provider === 'google') {
    return 'Google';
  }

  return 'With Run';
}

function formatBirthDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${year}.${month}.${day}`;
}

function formatGender(value: UserProfileResponse['gender']): string | null {
  if (value === 'MALE') {
    return '남성';
  }

  if (value === 'FEMALE') {
    return '여성';
  }

  return null;
}

function syncProfileIntoAuthStore(profile: UserProfileResponse): void {
  const currentUser = useAuthStore.getState().user;

  if (!currentUser) {
    return;
  }

  useAuthStore.getState().updateUser({
    ...currentUser,
    ...profile,
  });
}

function ProfileMetricChip({ label, value }: ProfileMetricChipProps) {
  return (
    <div className="rounded-full border border-border-default bg-primary-5 px-4 py-2 body-m text-fg-primary">
      <span className="text-fg-secondary">{label}</span> {value}
    </div>
  );
}

export function ProfileScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { handleLogout, isLoggingOut } = useLogout();
  const [profile, setProfile] =
    useState<UserProfileResponse>(createProfileState());
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const providerLabel = useMemo(
    () => formatProvider(user?.provider),
    [user?.provider]
  );
  const genderLabel = useMemo(
    () => formatGender(profile.gender),
    [profile.gender]
  );
  const birthDateLabel = useMemo(
    () => formatBirthDate(profile.birthDate),
    [profile.birthDate]
  );

  useEffect(() => {
    let isCancelled = false;

    void (async () => {
      try {
        // 프로필 화면은 auth store 값이 있어도 서버 조회를 한 번 더 해서 최신 프로필을 기준으로 렌더링한다.
        const response = await getUserProfile();

        if (isCancelled) {
          return;
        }

        setProfile(response);
        syncProfileIntoAuthStore(response);
      } catch {
        if (isCancelled) {
          return;
        }

        toast.error('프로필 정보를 불러오지 못했어요.');
      } finally {
        if (!isCancelled) {
          setIsLoadingProfile(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleSavedProfile(nextProfile: UserProfileResponse) {
    setProfile(nextProfile);
    syncProfileIntoAuthStore(nextProfile);
  }

  async function handleDeleteAccount() {
    if (isDeletingAccount) {
      return;
    }

    setIsDeleteOpen(true);
  }

  async function handleDeleteAccountConfirm() {
    setIsDeleteOpen(false);
    setIsDeletingAccount(true);

    try {
      // 탈퇴가 끝나면 로컬 세션도 즉시 비워서 stale user 정보가 남지 않게 한다.
      await deleteUserProfile();
      clearAuth();
      toast.success('회원탈퇴가 완료되었어요.');
      navigate('/onboarding', { replace: true });
    } catch {
      toast.error('회원탈퇴를 완료하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsDeletingAccount(false);
    }
  }

  return (
    <>
      <div className="min-h-[calc(100dvh-5rem)] overflow-y-auto bg-surface-subtle px-5 pb-10 pt-3">
        <div className="mx-auto flex max-w-[430px] flex-col gap-5">
          <section className="overflow-hidden rounded-3xl border border-border-default bg-[linear-gradient(180deg,hsl(var(--primary-5))_0%,hsl(var(--surface-default))_62%,hsl(var(--surface-subtle))_100%)] p-6 text-fg-primary shadow-lg">
            <div className="mt-2 flex flex-col items-center text-center">
              <div className="space-y-1">
                <h2 className="text-3xl font-black">
                  {profile.nickname ?? 'Runner'}
                </h2>
                <p className="caption-b text-fg-secondary">
                  {providerLabel}
                </p>
                <p className="body-r text-fg-secondary">
                  {birthDateLabel ?? '생년월일 미등록'}
                  {birthDateLabel && genderLabel ? ' · ' : ''}
                  {genderLabel ?? '성별 미등록'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {profile.height ? (
                  <ProfileMetricChip
                    label="키"
                    value={`${profile.height.toLocaleString('ko-KR')}cm`}
                  />
                ) : null}
                {profile.weight ? (
                  <ProfileMetricChip
                    label="몸무게"
                    value={`${profile.weight.toLocaleString('ko-KR')}kg`}
                  />
                ) : null}
              </div>

            </div>
          </section>

          {isLoadingProfile ? (
            <div className="rounded-2xl border border-border-default bg-surface-default px-4 py-6 text-center body-r text-fg-secondary">
              프로필 정보를 불러오는 중이에요.
            </div>
          ) : null}

          <section className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(true)}
              className="h-14 w-full rounded-2xl border-border-default bg-surface-default text-base font-black text-fg-primary shadow-sm hover:bg-surface-subtle"
            >
              <PencilLine size={18} />
              프로필 수정
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLogoutOpen(true)}
              disabled={isLoggingOut}
              className="h-14 w-full rounded-2xl border-border-default bg-surface-default text-base font-black text-fg-primary shadow-sm hover:bg-surface-subtle"
            >
              <LogOut size={18} />
              로그아웃
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDeleteAccount()}
              disabled={isDeletingAccount}
              className="h-14 w-full rounded-2xl border-border-default bg-surface-default text-base font-black text-fg-error shadow-sm hover:bg-error/[0.05] disabled:opacity-70"
            >
              <ShieldAlert size={18} />
              {isDeletingAccount ? '회원탈퇴 처리 중...' : '회원탈퇴'}
            </Button>
          </section>
        </div>
      </div>

      <ProfileEditDialog
        isOpen={isEditOpen}
        profile={profile}
        onOpenChange={setIsEditOpen}
        onSaved={handleSavedProfile}
      />

      <ProfileLogoutDialog
        isOpen={isLogoutOpen}
        isLoggingOut={isLoggingOut}
        onOpenChange={setIsLogoutOpen}
        onConfirm={() => {
          setIsLogoutOpen(false);
          void handleLogout();
        }}
      />

      <ProfileDeleteDialog
        isOpen={isDeleteOpen}
        isDeletingAccount={isDeletingAccount}
        onOpenChange={setIsDeleteOpen}
        onConfirm={() => void handleDeleteAccountConfirm()}
      />
    </>
  );
}
