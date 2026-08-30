import { ProtectedRoute } from '@/components/auth/protected-route';
import { CreatePromptForm } from '@/components/prompts/create-prompt-form';

export default async function CreatePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ variantFrom?: string }> }>) {
  const { variantFrom } = await searchParams;

  return (
    <ProtectedRoute>
      <CreatePromptForm variantFrom={variantFrom} />
    </ProtectedRoute>
  );
}
