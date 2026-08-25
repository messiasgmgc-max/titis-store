"use client";

import React, { useRef } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { StyleMatchStepFlow } from '@/components/StyleMatchStepFlow';
import { CatalogSection } from '@/components/CatalogSection';
import { AiConsultantWidget } from '@/components/AiConsultantWidget';
import { Footer } from '@/components/Footer';

export default function Home() {
  const consultationRef = useRef<HTMLDivElement>(null);

  const scrollToConsultation = () => {
    const el = document.getElementById('consultoria');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-slate-100 flex flex-col justify-between">
      <div>
        {/* Navigation Header */}
        <Header onStartConsultation={scrollToConsultation} />

        {/* Hero Section */}
        <HeroSection onStartConsultation={scrollToConsultation} />

        {/* Interactive Multi-step StyleMatch Consultant */}
        <div ref={consultationRef}>
          <StyleMatchStepFlow />
        </div>

        {/* Featured Signature Catalog */}
        <CatalogSection />
      </div>

      {/* Floating AI Consultant Assistant */}
      <AiConsultantWidget />

      {/* Footer */}
      <Footer />
    </div>
  );
}
