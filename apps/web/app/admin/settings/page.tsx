import { AdminSettings } from '@/components/admin/settings';
export const metadata = {
  title: 'Workspace settings',
  robots: { index: false },
};
export default function Page() {
  return <AdminSettings />;
}
