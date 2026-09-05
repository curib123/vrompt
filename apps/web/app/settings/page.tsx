import { WorkspaceShell } from '@/components/workspace/shell';
import { UserPreferences } from '@/components/workspace/preferences';
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return (
    <WorkspaceShell>
      <UserPreferences />
    </WorkspaceShell>
  );
}
