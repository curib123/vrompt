import { ProtectedRoute } from '@/components/auth/protected-route';
import { FollowingFeed } from '@/components/activity/following-feed';

export default function FollowingPage() {
  return (
    <ProtectedRoute>
      <FollowingFeed />
    </ProtectedRoute>
  );
}
