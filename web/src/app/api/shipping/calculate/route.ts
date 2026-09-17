// ============================================================
// POST /api/shipping/calculate — Cálculo de Frete (Melhor Envio)
// Retorna opções de PAC, SEDEX, Jadlog e Loggi para o CEP informado
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { MelhorEnvioService } from '@/lib/server/melhorenvio';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destinationCep, itemsCount = 1, subtotalCents = 0 } = body;

    if (!destinationCep || typeof destinationCep !== 'string') {
      return NextResponse.json({ error: 'CEP de destino obrigatório.' }, { status: 400 });
    }

    const cleanCep = destinationCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return NextResponse.json({ error: 'CEP deve conter 8 dígitos numéricos.' }, { status: 400 });
    }

    const options = await MelhorEnvioService.calculateShipping({
      destinationCep: cleanCep,
      itemsCount: Number(itemsCount) || 1,
      subtotalCents: Number(subtotalCents) || 0,
    });

    return NextResponse.json({ options });
  } catch (err: any) {
    console.error('[api/shipping/calculate] Erro:', err);
    return NextResponse.json({ error: 'Erro ao calcular frete.' }, { status: 500 });
  }
}
