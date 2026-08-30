import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoutePlaceholder } from '@/components/route-placeholder';

export default function CollectionsPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        description="Collection organization arrives in a later phase. This route establishes the responsive screen foundation now."
        eyebrow="Collections"
        title="Organize your prompt collections"
      />
    </ProtectedRoute>
  );
}
