import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { AccountDashboard } from '@/components/account/AccountDashboard';
import { AccountLoader } from '@/components/account/AccountLoader';

export const metadata: Metadata = {
  title: 'Minha conta',
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="min-h-dvh">
        {/* useSearchParams (aba ativa) exige limite de Suspense na pré-renderização. */}
        <Suspense fallback={<AccountLoader />}>
          <AccountDashboard />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
