import { ProtectedRoute } from '@/components/auth/protected-route';
import { NotificationsView } from '@/components/notifications/notifications-view';

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsView />
    </ProtectedRoute>
  );
}
