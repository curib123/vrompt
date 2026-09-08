'use client';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Modal } from '@/components/ui/modal';
import { useFeedback } from '@/components/ui/feedback-modal';
import { Icon } from '@/components/ui/icon';
import { apiRequest } from '@/lib/api';
import { PageHeading } from '@/components/ui/page-heading';
import { Pagination } from '@/components/ui/pagination';
import { useAdminResource } from './use-admin-resource';

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  staffCredential: { lastLoginAt: string | null } | null;
};
type Page<T> = {
  items: T[];
  total: number;
  page: number;
  hasNextPage: boolean;
};

export function AdminUsers() {
  const { user: actor } = useAuth();
  const { alert } = useFeedback();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, refresh, accessToken } = useAdminResource<
    Page<User>
  >(
    `/admin/users?${new URLSearchParams({ q: search, page: String(page), ...(role ? { role } : {}) })}`,
  );
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const body =
      editing === 'new'
        ? {
            email: form.get('email'),
            username: form.get('username'),
            password,
            role: 'ADMIN',
          }
        : {
            role: form.get('role'),
            status: form.get('status'),
            ...(password ? { password } : {}),
          };
    setBusy(true);
    setFormError('');
    try {
      await apiRequest(
        `/admin/users${editing === 'new' ? '' : `/${editing.id}`}`,
        {
          accessToken: accessToken!,
          method: editing === 'new' ? 'POST' : 'PATCH',
          body: JSON.stringify(body),
        },
      );
      setEditing(null);
      refresh();
      alert({
        tone: 'success',
        title: editing === 'new' ? 'Administrator created' : 'Account updated',
        message: 'The account changes are now active.',
      });
    } catch (e) {
      const message = (e as Error).message;
      setFormError(message);
      alert({ tone: 'error', title: 'Could not save account', message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content-page">
      <PageHeading
        title="Users"
        description="Manage user accounts and administrator access."
      >
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setFormError('');
            setEditing('new');
          }}
        >
          <Icon name="plus" /> Add admin
        </button>
      </PageHeading>
      <form
        className="admin-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(query);
          setPage(1);
        }}
      >
        <input
          type="search"
          aria-label="Search users"
          placeholder="Search name or email…"
          maxLength={120}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="secondary-button" aria-label="Search">
          <Icon name="search" /> Search
        </button>
        <select
          aria-label="Filter role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="USER">Users</option>
          <option value="ADMIN">Admins</option>
        </select>
        {(query || search || role) && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setQuery('');
              setSearch('');
              setRole('');
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </form>
      {error && (
        <p role="alert" className="error-banner">
          {error} <button onClick={refresh}>Try again</button>
        </p>
      )}
      <div className="panel">
        <p className="table-scroll-hint">Scroll sideways to see all columns.</p>
        <div
          className="table-wrap"
          role="region"
          aria-label="accounts"
          tabIndex={0}
        >
          <table className="data-table">
            <caption className="sr-only">accounts</caption>
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Joined</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                data?.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                      <small>{user.email}</small>
                    </td>
                    <td>{user.role.toLowerCase()}</td>
                    <td>
                      <span
                        className={`status-badge ${user.status.toLowerCase()}`}
                      >
                        {user.status.toLowerCase()}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="secondary-button"
                        aria-label={`Manage ${user.username}`}
                        disabled={user.status === 'DELETED'}
                        onClick={() => {
                          setFormError('');
                          setEditing(user);
                        }}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <p className="empty-state-message" role="status">
            Loading accounts…
          </p>
        ) : !data?.items.length && !error ? (
          <p className="empty-state-message">No accounts match this search.</p>
        ) : null}
      </div>
      {data && (
        <Pagination
          page={page}
          total={data.total}
          noun="accounts"
          loading={loading}
          hasNextPage={data.hasNextPage}
          onChange={setPage}
        />
      )}
      <Modal
        open={Boolean(editing)}
        title={editing === 'new' ? 'Add administrator' : 'Manage account'}
        description={
          editing === 'new'
            ? 'Administrators can manage accounts, models, billing, and settings.'
            : typeof editing === 'object'
              ? (editing?.email ?? '')
              : ''
        }
        onClose={() => {
          if (!busy) setEditing(null);
        }}
      >
        <form
          className="panel"
          onSubmit={save}
          key={editing === 'new' ? 'new' : editing?.id}
        >
          {editing === 'new' ? (
            <>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                  maxLength={320}
                />
              </label>
              <label>
                Username
                <input
                  name="username"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9_-]+"
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Role
                <select
                  name="role"
                  defaultValue={editing?.role === 'ADMIN' ? 'ADMIN' : 'USER'}
                  disabled={busy}
                >
                  {editing?.id !== actor?.id && (
                    <option value="USER">User</option>
                  )}
                  <option value="ADMIN">Administrator</option>
                </select>
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={editing?.status}
                  disabled={busy}
                >
                  <option value="ACTIVE">Active</option>
                  {editing?.id !== actor?.id && (
                    <option value="SUSPENDED">Suspended</option>
                  )}
                </select>
              </label>
            </>
          )}
          {(editing === 'new' || editing?.id !== actor?.id) && (
            <label>
              {editing === 'new' ? 'Password' : 'New admin password (optional)'}
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required={editing === 'new'}
                minLength={12}
                maxLength={128}
                disabled={busy}
              />
            </label>
          )}
          <p className="muted">
            Use at least 12 characters. Passwords apply to administrator
            accounts only. Set a password when promoting a user. Change your own
            password in Settings.
          </p>
          {formError && (
            <p className="error-banner" role="alert">
              {formError}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? 'Saving…' : 'Save account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
