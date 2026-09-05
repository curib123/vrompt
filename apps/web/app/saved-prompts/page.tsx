import { WorkspaceShell } from '@/components/workspace/shell';
import { SavedPrompts } from '@/components/workspace/pages';
export const metadata = { robots: { index: false, follow: false } };
export default function Page() { return <WorkspaceShell><SavedPrompts /></WorkspaceShell>; }
