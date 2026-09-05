import { WorkspaceShell } from '@/components/workspace/shell';
import { Workflows } from '@/components/workspace/workflows';
export const metadata = {
  title: 'Workflows',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <WorkspaceShell>
      <Workflows />
    </WorkspaceShell>
  );
}
