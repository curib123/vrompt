import { ProtectedRoute } from '@/components/auth/protected-route';
import { CreatePromptForm } from '@/components/prompts/create-prompt-form';

export default function CreatePage() {
  return (
    <ProtectedRoute>
      <CreatePromptForm />
    </ProtectedRoute>
  );
}
