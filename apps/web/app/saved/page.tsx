import { ProtectedRoute } from '@/components/auth/protected-route';
import { SavedRepositories } from '@/components/bookmarks/saved-repositories';

export default function SavedPage() {
  return (
    <ProtectedRoute>
      <SavedRepositories />
    </ProtectedRoute>
  );
}
