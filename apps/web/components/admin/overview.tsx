'use client';
import Link from 'next/link';
import { useAdminResource } from './use-admin-resource';
type System = {
  environment: string;
  checkedAt: string;
  dependencies: Record<string, { status: string; latencyMs: number | null }>;
  integrations: Record<string, boolean | string>;
};
export function OperationsOverview() {
  const dashboard =
    useAdminResource<Record<string, number>>('/admin/dashboard');
  const system = useAdminResource<System>('/admin/system');
  return (
    <div className="content-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>A clear view of your workspace.</h1>
      <p className="muted">
        Manage your models, support your users, and keep everything running
        smoothly.
      </p>
      {(dashboard.error || system.error) && (
        <p className="error-banner" role="alert">
          {dashboard.error || system.error}
        </p>
      )}
      <div className="feature-grid">
        {[
          ['users', 'Active accounts'],
          ['generations', 'Recorded generations'],
          ['models', 'Enabled models'],
          ['conversations', 'Conversations'],
          ['savedPrompts', 'Saved prompts'],
          ['staff', 'Administrators'],
        ].map(([key, label]) => (
          <div className="panel" key={key}>
            <p className="eyebrow">{label}</p>
            <h2>{dashboard.data?.[key!] ?? '—'}</h2>
          </div>
        ))}
      </div>
      <div className="admin-toolbar">
        <h2>Service health</h2>
        <button
          className="secondary-button"
          onClick={() => {
            dashboard.refresh();
            system.refresh();
          }}
        >
          Refresh status
        </button>
      </div>
      <section className="panel">
        {system.loading && (
          <p className="muted" role="status">
            Checking dependencies…
          </p>
        )}
        {system.data && (
          <>
            <p className="muted">
              {system.data.environment} · Checked{' '}
              {new Date(system.data.checkedAt).toLocaleString()}
            </p>
            {Object.entries(system.data.dependencies).map(
              ([name, dependency]) => (
                <div className="row" key={name}>
                  <span>
                    {name === 'redis'
                      ? 'Cache'
                      : name === 'database'
                        ? 'Database'
                        : name === 'oracleServer'
                          ? 'Configured server'
                          : 'Public domain'}
                  </span>
                  <span className={`status-badge ${dependency.status}`}>
                    {dependency.status.replaceAll('_', ' ')}
                    {dependency.latencyMs !== null
                      ? ` · ${dependency.latencyMs} ms`
                      : ''}
                  </span>
                </div>
              ),
            )}
          </>
        )}
      </section>
      <h2>Connected services</h2>
      <section className="panel">
        {system.data &&
          Object.entries(system.data.integrations)
            .filter(([name]) => name !== 'cloudStorage')
            .map(([name, value]) => (
              <div className="row" key={name}>
                <span>
                  {(
                    {
                      googleOAuth: 'Google sign-in',
                      githubOAuth: 'GitHub sign-in',
                      aiProvider: 'AI provider credentials',
                      payMongo: 'Payments',
                      storageDriver: 'File storage',
                    } as Record<string, string>
                  )[name] ?? name}
                </span>
                <span className="status-badge">
                  {typeof value === 'boolean'
                    ? value
                      ? 'Configured'
                      : 'Not configured'
                    : value}
                </span>
              </div>
            ))}
      </section>
      <div className="row-actions">
        <Link className="primary-button" href="/admin/models">
          Configure models
        </Link>
        <Link className="secondary-button" href="/admin/settings">
          Workspace settings
        </Link>
        <Link className="secondary-button" href="/admin/users">
          Manage users
        </Link>
      </div>
    </div>
  );
}
