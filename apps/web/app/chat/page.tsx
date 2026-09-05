import { Suspense } from 'react';
import { WorkspaceShell } from '@/components/workspace/shell';
import { Chat } from '@/components/workspace/chat';
export const metadata = { title: 'Chat', robots: { index: false, follow: false } };
export default function Page() { return <WorkspaceShell><Suspense fallback={<p>Opening chat…</p>}><Chat /></Suspense></WorkspaceShell>; }
