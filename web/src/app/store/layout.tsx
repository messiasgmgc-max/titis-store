import React from 'react';
import { StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian text-ivory">
      <StoreHeader />
      <div className="flex-1">
        {children}
      </div>
      <StoreFooter />
    </div>
  );
}
