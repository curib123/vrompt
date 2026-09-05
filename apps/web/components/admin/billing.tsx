'use client';
import Link from 'next/link';
import { useAdminResource } from './use-admin-resource';
type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  user: { username: string; email: string } | null;
};
type Webhook = {
  externalEventId: string;
  eventType: string;
  errorCode: string | null;
  receivedAt: string;
};
export function AdminBilling() {
  const overview = useAdminResource<{
    activeSubscriptions: number;
    failedWebhooks: number;
    payments: Record<string, number>;
  }>('/admin/billing/overview');
  const payments = useAdminResource<Payment[]>('/admin/billing/payments');
  const failures = useAdminResource<Webhook[]>(
    '/admin/billing/webhook-failures',
  );
  const error = overview.error || payments.error || failures.error;
  return (
    <div className="content-page">
      <p className="eyebrow">SUBSCRIPTIONS & PAYMENTS</p>
      <h1>Billing operations</h1>
      <p className="muted">
        Monitor payments and investigate webhook failures. Amounts retain each
        payment’s currency.
      </p>
      <div className="admin-toolbar">
        <Link className="primary-button" href="/admin/plans">
          Manage plans & allowances
        </Link>
        <button
          className="secondary-button"
          onClick={() => {
            overview.refresh();
            payments.refresh();
            failures.refresh();
          }}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      <div className="feature-grid">
        {[
          ['Active subscriptions', overview.data?.activeSubscriptions],
          [
            'Paid checkouts',
            overview.data?.payments.PAID ?? (overview.data ? 0 : undefined),
          ],
          ['Failed webhooks', overview.data?.failedWebhooks],
        ].map(([label, value]) => (
          <section className="panel" key={label}>
            <p className="eyebrow">{label}</p>
            <h2>{value ?? '—'}</h2>
          </section>
        ))}
      </div>
      <h2>Recent payments</h2>
      <p className="muted">The latest 100 payments.</p>
      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.data?.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.user?.username ?? 'Deleted account'}
                    <small>{payment.user?.email}</small>
                  </td>
                  <td>
                    {new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: payment.currency,
                    }).format(payment.amount / 100)}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${payment.status.toLowerCase()}`}
                    >
                      {payment.status.toLowerCase()}
                    </span>
                  </td>
                  <td>{new Date(payment.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {payments.loading ? (
          <p className="empty-state-message" role="status">
            Loading payments…
          </p>
        ) : !payments.data?.length && !payments.error ? (
          <p className="empty-state-message">No payments recorded yet.</p>
        ) : null}
      </div>
      <h2>Webhook failures</h2>
      <div className="panel">
        {failures.data?.map((failure) => (
          <div className="row" key={failure.externalEventId}>
            <div>
              <strong>{failure.eventType}</strong>
              <p className="muted">
                {failure.errorCode ?? 'Processing failed'} ·{' '}
                {new Date(failure.receivedAt).toLocaleString()}
              </p>
              <small>{failure.externalEventId}</small>
            </div>
          </div>
        ))}
        {failures.loading ? (
          <p role="status" className="muted">
            Loading webhook events…
          </p>
        ) : !failures.data?.length && !failures.error ? (
          <p className="muted">No failed webhook events.</p>
        ) : null}
      </div>
    </div>
  );
}
