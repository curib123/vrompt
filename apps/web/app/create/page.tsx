import { ProtectedRoute } from '@/components/auth/protected-route';
import { PromptManager } from '@/components/prompts/prompt-manager';

export default async function CreatePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ variantFrom?: string }> }>) {
  const { variantFrom } = await searchParams;

  return (
    <ProtectedRoute>
      <PromptManager variantFrom={variantFrom} />
    </ProtectedRoute>
  );
}
