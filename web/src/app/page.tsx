"use client";

import React, { useState, useRef } from 'react';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { StyleMatchStepFlow } from '@/components/StyleMatchStepFlow';
import { PricingPassSection } from '@/components/PricingPassSection';
import { CatalogSection } from '@/components/CatalogSection';
import { AiConsultantWidget } from '@/components/AiConsultantWidget';
import { Footer } from '@/components/Footer';
import { CartItem } from '@/components/WhatsAppCartModal';

export default function Home() {
  const consultationRef = useRef<HTMLDivElement>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = (item: CartItem) => {
    setCartItems((prev) => [...prev, item]);
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

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
        <Header
          onStartConsultation={scrollToConsultation}
          cartItems={cartItems}
          onRemoveCartItem={handleRemoveCartItem}
          onClearCart={handleClearCart}
        />

        {/* Hero Section */}
        <HeroSection onStartConsultation={scrollToConsultation} />

        {/* Interactive Multi-step StyleMatch Consultant */}
        <div ref={consultationRef}>
          <StyleMatchStepFlow onAddToCart={handleAddToCart} />
        </div>

        {/* Pricing & Digital Access Passes */}
        <PricingPassSection />

        {/* Featured Signature Catalog */}
        <CatalogSection onAddToCart={handleAddToCart} />
      </div>

      {/* Floating AI Consultant Assistant */}
      <AiConsultantWidget />

      {/* Footer */}
      <Footer />
    </div>
  );
}
