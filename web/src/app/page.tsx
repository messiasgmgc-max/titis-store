import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { HomeHero } from '@/components/home/HomeHero';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PlansSection } from '@/components/home/PlansSection';
import { StoreStrip } from '@/components/home/StoreStrip';
import { FaqSection } from '@/components/home/FaqSection';
import { FinalCta } from '@/components/home/FinalCta';

export default function HomePage() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <HomeHero />
        <HowItWorks />
        <PlansSection />
        <StoreStrip />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
