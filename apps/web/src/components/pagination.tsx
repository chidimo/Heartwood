import { cn } from '../lib/cn';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const pageNumbers = (page: number, totalPages: number): (number | 'gap')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | 'gap')[] = [1];
  if (page > 3) pages.push('gap');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
  if (page < totalPages - 2) pages.push('gap');
  pages.push(totalPages);
  return pages;
};

const BUTTON = 'h-9 min-w-9 rounded-lg px-3 text-sm hover:bg-primary-600/10 disabled:opacity-40';

/** Previous, numbered and next buttons; hidden when everything fits on one page. */
export const Pagination = ({ page, totalPages, onPageChange }: Props) => {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-center gap-1">
      <button
        type="button"
        className={BUTTON}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      {pageNumbers(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-ink/50 dark:text-white/50">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-current={p === page ? 'page' : undefined}
            className={cn(BUTTON, p === page && 'bg-primary-600 text-white hover:bg-primary-600')}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className={BUTTON}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
};
