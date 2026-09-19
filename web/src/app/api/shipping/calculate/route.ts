// ============================================================
// POST /api/shipping/calculate — Cálculo de Frete (SuperFrete / Melhor Envio)
// Retorna opções de Correios PAC, SEDEX, Mini Envios e Jadlog para o CEP informado
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { SuperFreteService } from '@/lib/server/superfrete';
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

    const provider = (process.env.FRETE_PROVIDER || 'superfrete').toLowerCase();
    const hasSuperFrete = Boolean((process.env.SUPERFRETE_TOKEN ?? '').trim());
    const hasMelhorEnvio = Boolean((process.env.MELHORENVIO_TOKEN ?? '').trim());

    let options = [];
    if (provider === 'melhorenvio' || (!hasSuperFrete && hasMelhorEnvio)) {
      options = await MelhorEnvioService.calculateShipping({
        destinationCep: cleanCep,
        itemsCount: Number(itemsCount) || 1,
        subtotalCents: Number(subtotalCents) || 0,
      });
    } else {
      options = await SuperFreteService.calculateShipping({
        destinationCep: cleanCep,
        itemsCount: Number(itemsCount) || 1,
        subtotalCents: Number(subtotalCents) || 0,
      });
    }

    if (!options || options.length === 0) {
      options = await SuperFreteService.calculateShipping({
        destinationCep: cleanCep,
        itemsCount: Number(itemsCount) || 1,
        subtotalCents: Number(subtotalCents) || 0,
      });
    }

    const retiradaOption = {
      id: 'retirada-betim',
      name: 'Retirada Grátis (Betim)',
      carrier: 'Retirada',
      priceCents: 0,
      deliveryDays: 1,
      isFree: true,
    };

    const finalOptions = [
      retiradaOption,
      ...(options || []).filter((o: any) => o.id !== 'retirada-betim'),
    ];

    return NextResponse.json({ options: finalOptions });
  } catch (err: any) {
    console.error('[api/shipping/calculate] Erro ao consultar frete, aplicando contingência regional:', err);
    const retiradaOption = {
      id: 'retirada-betim',
      name: 'Retirada Grátis (Betim)',
      carrier: 'Retirada',
      priceCents: 0,
      deliveryDays: 1,
      isFree: true,
    };
    try {
      const fallbackOptions = await SuperFreteService.calculateShipping({
        destinationCep: '30130000',
        itemsCount: 1,
        subtotalCents: 0,
      });
      return NextResponse.json({
        options: [retiradaOption, ...(fallbackOptions || []).filter((o: any) => o.id !== 'retirada-betim')],
      });
    } catch {
      return NextResponse.json({
        options: [
          retiradaOption,
          {
            id: 'pac',
            name: 'Correios PAC',
            carrier: 'Correios',
            priceCents: 2290,
            deliveryDays: 5,
            isFree: false,
          },
          {
            id: 'sedex',
            name: 'Correios SEDEX',
            carrier: 'Correios',
            priceCents: 3490,
            deliveryDays: 2,
            isFree: false,
          },
          {
            id: 'jadlog',
            name: 'Jadlog .Package',
            carrier: 'Jadlog',
            priceCents: 2090,
            deliveryDays: 4,
            isFree: false,
          },
        ],
      });
    }
  }
}
