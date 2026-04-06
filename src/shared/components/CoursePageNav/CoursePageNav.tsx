import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  currentPage: number; // 1-indexed
  totalPages: number;
  onPageChange: (page: number) => void; // 1-indexed
};

function getPageWindow(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];
  const delta = 2;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  pages.push(1);
  if (left > 2) pages.push('...');
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

export function CoursePageNav({
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  if (totalPages === 0) return null;

  const pages = getPageWindow(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary transition-colors disabled:opacity-30"
        aria-label="이전 페이지"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-8 w-8 items-center justify-center text-sm text-fg-secondary"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'border border-border-default text-fg-primary hover:bg-surface-subtle'
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-8 w-8 items-center justify-center rounded-full text-fg-secondary transition-colors disabled:opacity-30"
        aria-label="다음 페이지"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
