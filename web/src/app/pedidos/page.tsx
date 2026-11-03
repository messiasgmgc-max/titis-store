import type { Metadata } from 'next';
import { Suspense } from 'react';
import { OrderCenter } from '@/components/orders/OrderCenter';

export const metadata: Metadata = { title: 'Pedidos', robots: { index: false, follow: false } };
export default function OrdersPage() {
  return <Suspense fallback={<p className="p-8 text-mist">Abrindo pedidos…</p>}><OrderCenter /></Suspense>;
}
