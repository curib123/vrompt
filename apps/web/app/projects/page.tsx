import { WorkspaceShell } from '@/components/workspace/shell';
import { Projects } from '@/components/workspace/projects';
export const metadata = {
  title: 'Projects',
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <WorkspaceShell>
      <Projects />
    </WorkspaceShell>
  );
}
