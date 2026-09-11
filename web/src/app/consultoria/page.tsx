import type { Metadata } from 'next';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { ConsultingApp } from '@/components/consulting/ConsultingApp';

export const metadata: Metadata = {
  title: 'Minha consultoria',
  robots: { index: false, follow: false },
};

export default function ConsultingPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="min-h-dvh pt-[72px] lg:pt-[88px]">
        <ConsultingApp />
      </main>
      <Footer />
    </>
  );
}
