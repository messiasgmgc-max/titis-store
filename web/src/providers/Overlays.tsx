'use client';

import { AnimatePresence } from 'framer-motion';
import { useUI } from './UIProvider';
import { AuthModal } from '@/components/overlays/AuthModal';
import { BagDrawer } from '@/components/overlays/BagDrawer';
import { ScannerModal } from '@/components/overlays/ScannerModal';
import { TryOnModal } from '@/components/overlays/TryOnModal';
import { ProductDrawer } from '@/components/overlays/ProductDrawer';
import { ConciergeWidget } from '@/components/overlays/ConciergeWidget';
import { Toaster } from '@/components/ui/Toaster';

/** Controlador global de modais/gavetas. Cada overlay recebe `onClose`. */
export function Overlays() {
  const { overlay, closeOverlay } = useUI();

  return (
    <>
      <AnimatePresence>
        {overlay?.type === 'auth' && <AuthModal key="auth" mode={overlay.mode} onClose={closeOverlay} />}
        {overlay?.type === 'bag' && <BagDrawer key="bag" onClose={closeOverlay} />}
        {overlay?.type === 'scanner' && <ScannerModal key="scanner" onClose={closeOverlay} />}
        {overlay?.type === 'tryon' && <TryOnModal key={`tryon-${overlay.look.id}`} look={overlay.look} onClose={closeOverlay} />}
        {overlay?.type === 'product' && (
          <ProductDrawer key={`product-${overlay.product.id}`} product={overlay.product} onClose={closeOverlay} />
        )}
      </AnimatePresence>
      <ConciergeWidget />
      <Toaster />
    </>
  );
}
