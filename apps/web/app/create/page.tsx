import { ProtectedRoute } from '@/components/auth/protected-route';
import { RoutePlaceholder } from '@/components/route-placeholder';

export default function CreatePage() {
  return (
    <ProtectedRoute>
      <RoutePlaceholder
        description="The create route is prepared for the future prompt editor, preview flow, and publish actions without shipping repository creation early."
        eyebrow="Create"
        title="Create a prompt repository"
      />
    </ProtectedRoute>
  );
}
