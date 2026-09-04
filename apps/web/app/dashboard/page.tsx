import { ProtectedRoute } from '@/components/auth/protected-route';
import { DailyWorkspace } from '@/components/dashboard/daily-workspace';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DailyWorkspace />
    </ProtectedRoute>
  );
}
