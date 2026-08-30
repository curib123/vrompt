import { Button } from '@/components/ui/button';

export function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 rounded-[2rem] border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <Button aria-label="Previous page" variant="secondary">
        Previous
      </Button>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Page {currentPage} of {totalPages}
      </p>
      <Button aria-label="Next page" variant="secondary">
        Next
      </Button>
    </nav>
  );
}
