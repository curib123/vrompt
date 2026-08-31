import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileSectionRedirect } from '@/components/profile/profile-section-redirect';

export default function CollectionsPage() {
  return (
    <ProtectedRoute>
      <ProfileSectionRedirect tab="collections" />
    </ProtectedRoute>
  );
}
