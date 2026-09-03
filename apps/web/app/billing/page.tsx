import { ProtectedRoute } from '@/components/auth/protected-route';
import { BillingAccountView } from '@/components/billing/billing-account-view';

export default function BillingPage() {
  return (
    <ProtectedRoute>
      <BillingAccountView />
    </ProtectedRoute>
  );
}
