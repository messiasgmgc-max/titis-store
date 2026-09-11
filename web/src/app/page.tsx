import { Header } from '@/components/site/Header';
import { Hero } from '@/components/site/Hero';
import { Marquee } from '@/components/site/Marquee';
import { MethodSection } from '@/components/site/MethodSection';
import { Atelier } from '@/components/atelier/Atelier';
import { Collection } from '@/components/collection/Collection';
import { Manifesto } from '@/components/site/Manifesto';
import { ClubSection } from '@/components/club/ClubSection';
import { ContactSection } from '@/components/site/ContactSection';
import { Footer } from '@/components/site/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <Hero />
        <Marquee />
        <MethodSection />
        <Atelier />
        <Collection />
        <Manifesto />
        <ClubSection />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
