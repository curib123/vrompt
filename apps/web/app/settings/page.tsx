import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileSectionRedirect } from '@/components/profile/profile-section-redirect';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <ProfileSectionRedirect tab="settings" />
    </ProtectedRoute>
  );
}
