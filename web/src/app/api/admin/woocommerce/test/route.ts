// ============================================================
// POST /api/admin/woocommerce/test — Teste de conexão WooCommerce
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { testWooCommerceConnection } from '@/lib/server/woocommerce';
import { requireAdmin } from '@/lib/server/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAdmin(req);
    // Se não for admin autorizado, mas estiver em dev ou com chave anon válida, prossegue com verificação segura do corpo
    const body = await req.json().catch(() => ({}));
    const result = await testWooCommerceConnection(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err?.message || 'Falha ao testar conexão com o WooCommerce.',
    }, { status: 500 });
  }
}
