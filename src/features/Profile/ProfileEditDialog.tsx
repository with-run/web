import { LoaderCircle, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { AuthGender } from '@/apis/auth';
import {
  type UpdateUserProfileRequest,
  type UserProfileResponse,
  updateUserProfile,
} from '@/apis/UserProfile';
import { Button } from '@/shared/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/shadcn/dialog';
import { Input } from '@/shared/components/shadcn/input';
import { cn } from '@/shared/utils';

type ProfileEditDialogProps = {
  isOpen: boolean;
  profile: UserProfileResponse;
  onOpenChange: (open: boolean) => void;
  onSaved: (profile: UserProfileResponse) => void;
};

type ProfileFormValues = {
  nickname: string;
  birthDate: string;
  gender: AuthGender | null;
  height: string;
  weight: string;
};

function createFormValues(profile: UserProfileResponse): ProfileFormValues {
  return {
    nickname: profile.nickname ?? '',
    birthDate: profile.birthDate ?? '',
    gender: profile.gender,
    height: profile.height?.toString() ?? '',
    weight: profile.weight?.toString() ?? '',
  };
}

function parsePositiveNumber(value: string): number | null {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export function ProfileEditDialog({
  isOpen,
  profile,
  onOpenChange,
  onSaved,
}: ProfileEditDialogProps) {
  const [formValues, setFormValues] = useState<ProfileFormValues>(
    createFormValues(profile)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setFormValues(createFormValues(profile));
  }, [isOpen, profile]);

  const parsedHeight = useMemo(
    () => parsePositiveNumber(formValues.height),
    [formValues.height]
  );
  const parsedWeight = useMemo(
    () => parsePositiveNumber(formValues.weight),
    [formValues.weight]
  );
  // 시안에는 생년월일 입력이 없지만, 백엔드 수정 DTO 에 필수라서 null 사용자에게만 추가로 받는다.
  const needsBirthDateInput = profile.birthDate === null;
  const isFormValid =
    formValues.nickname.trim().length > 0 &&
    formValues.birthDate.length > 0 &&
    formValues.gender !== null &&
    parsedHeight !== null &&
    parsedWeight !== null;
  const hasChanges =
    formValues.nickname.trim() !== (profile.nickname ?? '') ||
    formValues.birthDate !== (profile.birthDate ?? '') ||
    formValues.gender !== profile.gender ||
    parsedHeight !== profile.height ||
    parsedWeight !== profile.weight;

  function updateField<K extends keyof ProfileFormValues>(
    field: K,
    value: ProfileFormValues[K]
  ) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  async function handleSubmit() {
    if (!isFormValid || !hasChanges || isSubmitting || !formValues.gender) {
      return;
    }

    const payload: UpdateUserProfileRequest = {
      // 이미 저장된 birthDate 는 숨김 필드처럼 유지해서 부분 수정이 아닌 전체 DTO 저장 규칙을 맞춘다.
      nickname: formValues.nickname.trim(),
      birthDate: formValues.birthDate,
      gender: formValues.gender,
      height: parsedHeight!,
      weight: parsedWeight!,
    };

    setIsSubmitting(true);

    try {
      await updateUserProfile(payload);
      onSaved(payload);
      toast.success('프로필이 저장되었어요.');
      onOpenChange(false);
    } catch {
      toast.error('프로필을 저장하지 못했어요. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="w-[calc(100%-2rem)] max-w-[360px] gap-6 rounded-[2rem] border border-border-default bg-surface-default p-6 text-fg-primary shadow-xl"
      >
        <DialogHeader className="gap-1 text-left">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-black text-fg-primary">
              프로필 수정
            </DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full text-fg-secondary hover:bg-surface-subtle active:opacity-70"
                aria-label="닫기"
              >
                <X size={22} />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-fg-secondary">
              닉네임
            </label>
            <Input
              value={formValues.nickname}
              onChange={(event) => updateField('nickname', event.target.value)}
              placeholder="닉네임을 입력해주세요"
              className="h-12 rounded-2xl border-border-default bg-surface-subtle px-4 text-base text-fg-primary placeholder:text-fg-secondary"
            ></Input>
          </div>

          {needsBirthDateInput ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-fg-secondary">
                생년월일
              </label>
              <Input
                type="date"
                value={formValues.birthDate}
                onChange={(event) =>
                  updateField('birthDate', event.target.value)
                }
                className="h-12 rounded-2xl border-border-default bg-surface-subtle px-4 text-base text-fg-primary placeholder:text-fg-secondary"
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-fg-secondary">
                키 (cm)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formValues.height}
                onChange={(event) => updateField('height', event.target.value)}
                placeholder="175"
                className="h-12 rounded-2xl border-border-default bg-surface-subtle px-4 text-base text-fg-primary placeholder:text-fg-secondary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-fg-secondary">
                몸무게 (kg)
              </label>
              <Input
                type="number"
                inputMode="decimal"
                value={formValues.weight}
                onChange={(event) => updateField('weight', event.target.value)}
                placeholder="70"
                className="h-12 rounded-2xl border-border-default bg-surface-subtle px-4 text-base text-fg-primary placeholder:text-fg-secondary"
              ></Input>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-fg-secondary">
              성별
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['MALE', 'FEMALE'] as const).map((gender) => {
                const isSelected = formValues.gender === gender;

                return (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => updateField('gender', gender)}
                    className={cn(
                      'h-12 rounded-2xl border text-base font-bold transition-colors',
                      isSelected
                        ? 'border-primary-1 bg-primary-5 text-primary-2'
                        : 'border-border-default bg-surface-default text-fg-secondary'
                    )}
                  >
                    {gender === 'MALE' ? '남성' : '여성'}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!isFormValid || !hasChanges || isSubmitting}
            className="h-14 w-full rounded-2xl text-base font-black"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                저장 중...
              </>
            ) : (
              '저장하기'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
