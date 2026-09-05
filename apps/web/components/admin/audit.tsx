'use client';
import { useState } from 'react';
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
      <p className="eyebrow">ACCOUNTABILITY</p>
      <h1>Audit history</h1>
      <p className="muted">
        Review recorded changes to accounts, billing, settings, and model
        routing.
      </p>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(actor);
          setPage(1);
        }}
      >
        <input
          aria-label="Filter by administrator username"
          placeholder="Filter by exact administrator username…"
          maxLength={120}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
        />
        <button className="secondary-button">Apply filter</button>
        <button type="button" className="secondary-button" onClick={refresh}>
          Refresh
        </button>
      </form>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Actor</th>
                <th>Recorded</th>
                <th>Details</th>
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
        <div className="pagination-bar">
          <span>
            {data.total} events · Page {page}
          </span>
          <div>
            <button
              className="secondary-button"
              disabled={loading || page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              className="secondary-button"
              disabled={loading || !data.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
