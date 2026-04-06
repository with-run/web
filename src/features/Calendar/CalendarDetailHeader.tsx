import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CalendarDetailHeader() {
  const navigate = useNavigate();

  return (
    <header className="shrink-0 border-b border-border-default bg-surface-subtle px-5 py-3">
      <button
        type="button"
        onClick={() => navigate('/calendar')}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-border-default bg-surface-default text-fg-primary shadow-sm"
        aria-label="뒤로가기"
      >
        <ArrowLeft size={20} />
      </button>
    </header>
  );
}
