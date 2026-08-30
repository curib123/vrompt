import { ProtectedRoute } from '@/components/auth/protected-route';
import { ModerationView } from '@/components/moderation/moderation-view';

export default function ModerationPage() {
  return (
    <ProtectedRoute>
      <ModerationView />
    </ProtectedRoute>
  );
}
