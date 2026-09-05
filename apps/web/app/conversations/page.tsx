import { WorkspaceShell } from '@/components/workspace/shell';
import { Conversations } from '@/components/workspace/pages';
export const metadata = { robots: { index: false, follow: false } };
export default function Page() { return <WorkspaceShell><Conversations /></WorkspaceShell>; }
