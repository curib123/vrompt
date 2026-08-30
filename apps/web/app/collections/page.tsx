import { ProtectedRoute } from '@/components/auth/protected-route';
import { CollectionsView } from '@/components/collections/collections-view';

export default function CollectionsPage() {
  return (
    <ProtectedRoute>
      <CollectionsView />
    </ProtectedRoute>
  );
}
