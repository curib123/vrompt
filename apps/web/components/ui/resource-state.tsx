import type { ReactNode } from 'react';

export function ResourceState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading: boolean;
  error?: string;
  empty?: boolean;
  onRetry: () => void;
  children?: ReactNode;
}) {
  if (loading)
    return (
      <p className="resource-state" role="status">
        Loading…
      </p>
    );
  if (error)
    return (
      <div className="resource-state">
        <p className="error-banner" role="alert">
          {error}
        </p>
        <button className="secondary-button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  if (empty) return <div className="resource-state">{children}</div>;
  return null;
}
