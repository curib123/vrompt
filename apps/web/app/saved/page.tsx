import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileSectionRedirect } from '@/components/profile/profile-section-redirect';

export default function SavedPage() {
  return (
    <ProtectedRoute>
      <ProfileSectionRedirect tab="saved" />
    </ProtectedRoute>
  );
}
