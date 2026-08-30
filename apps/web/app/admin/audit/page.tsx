import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuditView } from '@/components/audit/audit-view';

export default function AuditPage() {
  return (
    <ProtectedRoute>
      <AuditView />
    </ProtectedRoute>
  );
}
