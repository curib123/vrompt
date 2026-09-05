import { AdminRegistry } from '@/components/admin/configuration';
export const metadata = {
  title: 'Plans & allowances',
  robots: { index: false },
};
export default function Page() {
  return <AdminRegistry plans />;
}
