import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoutePlaceholder } from '@/components/route-placeholder';

export default function SavedPage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        description="Saved prompts will live here later. The shell already handles spacing, hierarchy, and empty-state presentation."
        eyebrow="Library"
        title="Saved repositories"
      />
    </ProtectedRoute>
  );
}
