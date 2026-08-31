import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileSectionRedirect } from '@/components/profile/profile-section-redirect';

export default function FollowingPage() {
  return (
    <ProtectedRoute>
      <ProfileSectionRedirect tab="following" />
    </ProtectedRoute>
  );
}
