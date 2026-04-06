import { Button } from '@/shared/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/shadcn/dialog';

type ProfileLogoutDialogProps = {
  isOpen: boolean;
  isLoggingOut: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ProfileLogoutDialog({
  isOpen,
  isLoggingOut,
  onOpenChange,
  onConfirm,
}: ProfileLogoutDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-black">로그아웃 하시겠습니까?</DialogTitle>
          <DialogDescription className="text-sm">
            서비스를 사용하려면 로그인이 필요합니다.
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
            disabled={isLoggingOut}
            className="h-12 flex-1 rounded-2xl bg-error text-base font-black text-white hover:bg-error/[0.9]"
          >
            {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
