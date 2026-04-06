import { TriangleAlert } from 'lucide-react';

import { Button } from '@/shared/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/shadcn/dialog';

type ProfileDeleteDialogProps = {
  isOpen: boolean;
  isDeletingAccount: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ProfileDeleteDialog({
  isOpen,
  isDeletingAccount,
  onOpenChange,
  onConfirm,
}: ProfileDeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/[0.1]">
            <TriangleAlert size={22} className="text-error" />
          </div>
          <DialogTitle className="text-xl font-black">회원탈퇴 하시겠습니까?</DialogTitle>
          <DialogDescription className="text-sm">
            탈퇴하면 모든 운동 기록과 계정 정보가 삭제되며,<br />이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-12 flex-1 rounded-2xl border-border-default bg-surface-default text-base font-black text-fg-primary"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeletingAccount}
            className="h-12 flex-1 rounded-2xl bg-error text-base font-black text-white hover:bg-error/[0.9]"
          >
            {isDeletingAccount ? '탈퇴 중...' : '탈퇴하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
