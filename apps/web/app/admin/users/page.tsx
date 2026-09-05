import Link from 'next/link';
export default function Page() { return <div className="content-page"><h1>Users</h1><p className="muted">Account status and staff access remain protected by the existing admin API.</p><Link href="/admin">Back to administration</Link></div>; }
