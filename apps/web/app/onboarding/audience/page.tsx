import { ProtectedRoute } from '@/components/auth/protected-route';
import { AudienceOnboarding } from '@/components/audiences/audience-onboarding';

export default function AudienceOnboardingPage() {
  return (
    <ProtectedRoute>
      <AudienceOnboarding />
    </ProtectedRoute>
  );
}
