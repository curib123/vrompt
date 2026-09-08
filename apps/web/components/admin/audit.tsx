'use client';
import { useState } from 'react';
import { PageHeading } from '@/components/ui/page-heading';
import { Pagination } from '@/components/ui/pagination';
import { useAdminResource } from './use-admin-resource';
type Entry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { username: string } | null;
};
export function AdminAudit() {
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState('');
  const [query, setQuery] = useState('');
  const { data, loading, error, refresh } = useAdminResource<{
    items: Entry[];
    total: number;
    hasNextPage: boolean;
  }>(
    `/admin/audit?${new URLSearchParams({ page: String(page), actor: query })}`,
  );
  return (
    <div className="content-page">
      <PageHeading
        title="Audit history"
        description="Review changes to accounts, billing, settings, and model routing."
      />
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(actor);
          setPage(1);
        }}
      >
        <input
          type="search"
          aria-label="Filter by administrator username"
          placeholder="Filter by exact administrator username…"
          maxLength={120}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
        />
        <button className="secondary-button">Apply filter</button>
        {(actor || query) && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setActor('');
              setQuery('');
              setPage(1);
            }}
          >
            Clear filter
          </button>
        )}
        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={refresh}
        >
          Refresh
        </button>
      </form>
      {error && (
        <p className="error-banner" role="alert">
          {error}{' '}
          <button className="secondary-button" onClick={refresh}>
            Try again
          </button>
        </p>
      )}
      <div className="panel">
        <p className="table-scroll-hint">Scroll sideways to see all columns.</p>
        <div
          className="table-wrap"
          role="region"
          aria-label="events"
          tabIndex={0}
        >
          <table className="data-table">
            <caption className="sr-only">events</caption>
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Actor</th>
                <th scope="col">Recorded</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                data?.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      {entry.action.toLowerCase().replaceAll('_', ' ')}
                      <small>
                        {entry.targetType.toLowerCase().replaceAll('_', ' ')}
                      </small>
                    </td>
                    <td>{entry.actor?.username ?? 'System'}</td>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>
                      <details>
                        <summary>View details</summary>
                        <pre className="audit-detail">
                          {JSON.stringify(
                            {
                              targetId: entry.targetId,
                              metadata: entry.metadata,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <p className="empty-state-message" role="status">
            Loading audit history…
          </p>
        ) : !data?.items.length && !error ? (
          <p className="empty-state-message">No events match this filter.</p>
        ) : null}
      </div>
      {data && (
        <Pagination
          page={page}
          total={data.total}
          noun="events"
          loading={loading}
          hasNextPage={data.hasNextPage}
          onChange={setPage}
        />
      )}
    </div>
  );
}
