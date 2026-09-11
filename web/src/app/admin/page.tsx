import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'Administração',
  robots: { index: false, follow: false },
};

/** Painel da administração. O acesso é validado no cliente (sessão) e garantido no banco (RLS). */
export default function AdminPage() {
  return <AdminShell />;
}
