import { ProtectedRoute } from '@/components/auth/protected-route';
import { PromptOrganizationPanel } from '@/components/organization/prompt-organization-panel';

export default function CreatePage() {
  return (
    <ProtectedRoute>
      <div className="grid gap-8">
        <PromptOrganizationPanel />
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Prompt writing and publishing arrive in Phase 9.
        </p>
      </div>
    </ProtectedRoute>
  );
}
