import { ProtectedRoute } from '@/components/auth/protected-route';
import { ProfileSettingsForm } from '@/components/profile/profile-settings-form';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <ProfileSettingsForm />
    </ProtectedRoute>
  );
}
