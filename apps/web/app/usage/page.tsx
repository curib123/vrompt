import { WorkspaceShell } from '@/components/workspace/shell';
import { UsagePage } from '@/components/workspace/pages';
export const metadata = { robots: { index: false, follow: false } };
export default function Page() { return <WorkspaceShell><UsagePage /></WorkspaceShell>; }
