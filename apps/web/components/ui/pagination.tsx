'use client';

export function Pagination({
  page,
  total,
  noun,
  loading,
  hasNextPage,
  onChange,
}: {
  page: number;
  total: number;
  noun: string;
  loading: boolean;
  hasNextPage: boolean;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="pagination-bar" aria-label={`${noun} pages`}>
      <span role="status">
        {total.toLocaleString()} {noun} · Page {page}
      </span>
      <div>
        <button
          className="secondary-button"
          disabled={loading || page === 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="secondary-button"
          disabled={loading || !hasNextPage}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
