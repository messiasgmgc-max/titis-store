import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { ConsultingLoader } from '@/components/consulting/ConsultingLoader';
import { SubscribeView } from '@/components/consulting/SubscribeView';

export const metadata: Metadata = {
  title: 'Assinar',
};

export default function SubscribePage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="min-h-dvh pt-[72px] lg:pt-[88px]">
        {/* useSearchParams (plano e retorno do pagamento) exige limite de Suspense na pré-renderização. */}
        <Suspense fallback={<ConsultingLoader label="Preparando sua assinatura" />}>
          <SubscribeView />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
