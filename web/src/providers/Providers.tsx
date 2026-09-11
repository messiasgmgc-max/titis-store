'use client';

import { MotionConfig } from 'framer-motion';
import { SessionProvider } from './SessionProvider';
import { DiagnosisProvider } from './DiagnosisProvider';
import { CartProvider } from './CartProvider';
import { UIProvider } from './UIProvider';
import { Overlays } from './Overlays';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionProvider>
        <DiagnosisProvider>
          <CartProvider>
            <UIProvider>
              {children}
              <Overlays />
            </UIProvider>
          </CartProvider>
        </DiagnosisProvider>
      </SessionProvider>
    </MotionConfig>
  );
}
