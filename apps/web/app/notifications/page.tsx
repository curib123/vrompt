import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoutePlaceholder } from '@/components/route-placeholder';

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        description="Notifications will eventually surface follows, likes, comments, and variant activity. The route shell is already available."
        eyebrow="Inbox"
        title="Notification center"
      />
    </ProtectedRoute>
  );
}
