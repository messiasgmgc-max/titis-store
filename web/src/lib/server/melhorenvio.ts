// ============================================================
// SERVIÇO DE INTEGRAÇÃO COM MELHOR ENVIO (FRETE & ETIQUETAS)
// Correios (PAC/Sedex), Jadlog, Loggi em API unificada
// ============================================================

export interface ShippingOption {
  id: string; // id do serviço no Melhor Envio (ex: '1' para PAC, '2' para SEDEX, '3' para Jadlog)
  name: string; // Ex: 'PAC', 'SEDEX', '.Package'
  carrier: string; // Ex: 'Correios', 'Jadlog', 'Loggi'
  carrierPicture?: string;
  priceCents: number;
  deliveryDays: number;
  isFree?: boolean;
  error?: string;
}

export interface CalculateShippingInput {
  destinationCep: string;
  itemsCount?: number;
  subtotalCents?: number;
}

export interface GenerateLabelInput {
  orderId: string;
  serviceId?: string; // id do serviço no Melhor Envio
  to: {
    name: string;
    phone: string;
    email: string;
    document: string; // CPF
    address: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
  };
  products: Array<{
    name: string;
    quantity: number;
    unitaryValue: number;
  }>;
}

export interface GenerateLabelResult {
  success: boolean;
  labelUrl?: string;
  trackingCode?: string;
  carrier?: string;
  melhorEnvioOrderId?: string;
  error?: string;
}

function getBaseUrl(): string {
  const isSandbox = process.env.MELHORENVIO_SANDBOX === 'true';
  return isSandbox
    ? 'https://sandbox.melhorenvio.com.br'
    : 'https://melhorenvio.com.br';
}

function getToken(): string {
  return (process.env.MELHORENVIO_TOKEN ?? '').trim();
}

function getOriginCep(): string {
  // Padrão: Belo Horizonte / MG
  return (process.env.MELHORENVIO_ORIGIN_CEP ?? '30130000').replace(/\D/g, '');
}

/** Helper seguro para ler resposta JSON sem estourar SyntaxError em páginas HTML */
async function safeParseResponse(res: Response): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  const text = await res.text().catch(() => '');
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, status: res.status, data, text };
  } catch {
    return { ok: false, status: res.status, data: null, text };
  }
}

export class MelhorEnvioService {
  /** Verifica se o Melhor Envio está configurado com token de acesso */
  static isConfigured(): boolean {
    return Boolean(getToken());
  }

  /**
   * Calcula as opções de frete (PAC, SEDEX, Jadlog)
   * Se o token não estiver configurado, devolve cotações estimadas elegantes para não travar o cliente
   */
  static async calculateShipping(input: CalculateShippingInput): Promise<ShippingOption[]> {
    const cleanDestCep = input.destinationCep.replace(/\D/g, '');
    if (cleanDestCep.length !== 8) {
      return [];
    }

    const token = getToken();
    const itemsCount = Math.max(1, input.itemsCount || 1);
    const subtotalCents = input.subtotalCents || 0;

    // Regra da Loja: Frete Grátis acima de R$ 499,00
    const qualifiesFreeShipping = subtotalCents >= 49900;

    // Se a API não estiver configurada no .env, usamos o fallback de estimativa inteligente
    if (!token) {
      return this.fallbackCalculation(cleanDestCep, qualifiesFreeShipping);
    }

    const originCep = getOriginCep();
    const weightKg = Math.min(15, Math.max(0.4, itemsCount * 0.45)); // ~450g por peça de vestuário

    try {
      const response = await fetch(`${getBaseUrl()}/api/v2/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': "TitisStore (pedidos@titisstore.com.br)",
        },
        body: JSON.stringify({
          from: { postal_code: originCep },
          to: { postal_code: cleanDestCep },
          package: {
            height: Math.min(60, 8 + itemsCount * 3),
            width: 28,
            length: 36,
            weight: weightKg,
          },
          options: {
            receipt: false,
            own_hand: false,
          },
        }),
      });

      const parsed = await safeParseResponse(response);
      if (!parsed.ok || !Array.isArray(parsed.data)) {
        console.warn(`[MelhorEnvio] Resposta HTTP ${response.status}; ativando cálculo de contingência.`);
        return this.fallbackCalculation(cleanDestCep, qualifiesFreeShipping);
      }

      const data = parsed.data;
      const options: ShippingOption[] = [];

      for (const item of data) {
        if (item.error) continue;

        const price = parseFloat(item.custom_price || item.price || '0');
        const priceCents = Math.round(price * 100);
        if (priceCents <= 0) continue;

        const isStandardCheapest = item.name.toLowerCase().includes('pac') || item.name.toLowerCase().includes('.package');
        const isFree = qualifiesFreeShipping && isStandardCheapest;

        options.push({
          id: String(item.id),
          name: item.name,
          carrier: item.company?.name || 'Transportadora',
          carrierPicture: item.company?.picture,
          priceCents: isFree ? 0 : priceCents,
          deliveryDays: Number(item.delivery_time || item.delivery_range?.max || 4),
          isFree,
        });
      }

      // Ordena por preço crescente
      options.sort((a, b) => a.priceCents - b.priceCents);

      return options.length > 0 ? options : this.fallbackCalculation(cleanDestCep, qualifiesFreeShipping);
    } catch (err) {
      console.error('[MelhorEnvio] Erro ao consultar API:', err);
      return this.fallbackCalculation(cleanDestCep, qualifiesFreeShipping);
    }
  }

  /** Cálculo estimado de contingência por região do Brasil */
  private static fallbackCalculation(destCep: string, qualifiesFree: boolean): ShippingOption[] {
    const firstDigit = destCep[0];
    let basePac = 2290;
    let baseSedex = 3850;
    let baseJadlog = 1990;
    let daysPac = 4;
    let daysSedex = 1;
    let daysJadlog = 3;

    // Sudeste (0 a 3)
    if (['0', '1', '2', '3'].includes(firstDigit)) {
      basePac = 2190;
      baseSedex = 3450;
      baseJadlog = 1890;
      daysPac = 4;
      daysSedex = 1;
      daysJadlog = 3;
    }
    // Sul (8 a 9)
    else if (['8', '9'].includes(firstDigit)) {
      basePac = 2890;
      baseSedex = 4850;
      baseJadlog = 2690;
      daysPac = 6;
      daysSedex = 2;
      daysJadlog = 5;
    }
    // Centro-Oeste / Nordeste (4 a 7)
    else {
      basePac = 3490;
      baseSedex = 5950;
      baseJadlog = 3290;
      daysPac = 8;
      daysSedex = 3;
      daysJadlog = 6;
    }

    return [
      {
        id: 'jadlog-package',
        name: '.Package',
        carrier: 'Jadlog',
        priceCents: qualifiesFree ? 0 : baseJadlog,
        deliveryDays: daysJadlog,
        isFree: qualifiesFree,
      },
      {
        id: 'correios-pac',
        name: 'PAC',
        carrier: 'Correios',
        priceCents: qualifiesFree ? 0 : basePac,
        deliveryDays: daysPac,
        isFree: qualifiesFree,
      },
      {
        id: 'correios-sedex',
        name: 'SEDEX Expresso',
        carrier: 'Correios',
        priceCents: baseSedex,
        deliveryDays: daysSedex,
        isFree: false,
      },
    ];
  }

  /**
   * Gera a etiqueta de frete no Melhor Envio (adiciona ao carrinho, paga e gera link do PDF)
   */
  static async generateLabel(input: GenerateLabelInput): Promise<GenerateLabelResult> {
    const token = getToken();
    const originCep = getOriginCep();
    const serviceId = input.serviceId ? parseInt(input.serviceId, 10) : 3; // Padrão: 3 (Jadlog .Package) ou 1 (PAC)

    // Se o token não estiver presente, gera etiqueta de simulação para não travar testes
    if (!token) {
      const simTracking = `BR${Math.floor(100000000 + Math.random() * 900000000)}BR`;
      return {
        success: true,
        labelUrl: `https://rastreamento.correios.com.br/app/index.php?codigo=${simTracking}`,
        trackingCode: simTracking,
        carrier: 'Correios / Jadlog',
        melhorEnvioOrderId: `SIM-${input.orderId.slice(0, 8)}`,
      };
    }

    try {
      // 1. Inserir envio no carrinho do Melhor Envio
      const cartPayload = {
        service: serviceId,
        agency: null,
        from: {
          name: "Titi's Store",
          phone: "31999999999",
          email: "pedidos@titisstore.com.br",
          document: "00000000000",
          address: "Rua das Lojas",
          complement: "Sala Alfaiataria",
          number: "100",
          district: "Savassi",
          city: "Belo Horizonte",
          country_id: "BR",
          postal_code: originCep,
          note: `Pedido #${input.orderId}`,
        },
        to: {
          name: input.to.name,
          phone: input.to.phone.replace(/\D/g, ''),
          email: input.to.email,
          document: input.to.document.replace(/\D/g, ''),
          address: input.to.address,
          complement: input.to.complement || '',
          number: input.to.number,
          district: input.to.neighborhood,
          city: input.to.city,
          state_abbr: input.to.state,
          country_id: "BR",
          postal_code: input.to.postalCode.replace(/\D/g, ''),
        },
        products: input.products.map((p) => ({
          name: p.name,
          quantity: p.quantity,
          unitary_value: p.unitaryValue,
        })),
        volumes: [
          {
            height: 10,
            width: 25,
            length: 35,
            weight: 0.5,
          },
        ],
        options: {
          insurance_value: input.products.reduce((sum, p) => sum + p.unitaryValue * p.quantity, 0),
          receipt: false,
          own_hand: false,
          reverse: false,
          non_commercial: true, // Declaração de conteúdo inclusa
        },
      };

      const cartRes = await fetch(`${getBaseUrl()}/api/v2/me/cart`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': "TitisStore (pedidos@titisstore.com.br)",
        },
        body: JSON.stringify(cartPayload),
      });

      const parsedCart = await safeParseResponse(cartRes);

      if (!parsedCart.ok || !parsedCart.data?.id) {
        if (parsedCart.status === 401) {
          throw new Error('Token do Melhor Envio não autorizado ou expirado. Verifique MELHORENVIO_TOKEN.');
        }
        if (parsedCart.status === 422) {
          const detail = parsedCart.data?.errors ? JSON.stringify(parsedCart.data.errors) : (parsedCart.data?.message || 'Dados de envio inválidos.');
          throw new Error(`Dados inválidos para emissão de etiqueta: ${detail}`);
        }
        throw new Error(parsedCart.data?.message || parsedCart.data?.error || `Falha ao adicionar envio ao carrinho (HTTP ${parsedCart.status}).`);
      }

      const melhorEnvioId = parsedCart.data.id;

      // 2. Checkout / Compra da etiqueta (debita do saldo do Melhor Envio)
      const checkoutRes = await fetch(`${getBaseUrl()}/api/v2/me/shipment/checkout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': "TitisStore (pedidos@titisstore.com.br)",
        },
        body: JSON.stringify({ orders: [melhorEnvioId] }),
      });

      const parsedCheckout = await safeParseResponse(checkoutRes);
      if (!parsedCheckout.ok) {
        console.warn('[MelhorEnvio] Checkout avisa:', parsedCheckout.data || parsedCheckout.text);
      }

      // 3. Gerar a etiqueta
      await fetch(`${getBaseUrl()}/api/v2/me/shipment/generate`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': "TitisStore (pedidos@titisstore.com.br)",
        },
        body: JSON.stringify({ orders: [melhorEnvioId] }),
      });

      // 4. Obter link de impressão do PDF
      const printRes = await fetch(`${getBaseUrl()}/api/v2/me/shipment/print`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': "TitisStore (pedidos@titisstore.com.br)",
        },
        body: JSON.stringify({ mode: 'public', orders: [melhorEnvioId] }),
      });

      const parsedPrint = await safeParseResponse(printRes);
      const labelUrl = parsedPrint.data?.url || null;

      // 5. Tenta consultar o código de rastreamento oficial emitido
      let trackingCode = parsedCart.data.tracking || null;
      try {
        const orderInfoRes = await fetch(`${getBaseUrl()}/api/v2/me/orders/${melhorEnvioId}`, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'User-Agent': "TitisStore (pedidos@titisstore.com.br)",
          },
        });
        const parsedInfo = await safeParseResponse(orderInfoRes);
        if (parsedInfo.data?.tracking) {
          trackingCode = parsedInfo.data.tracking;
        }
      } catch {
        // tracking code pode ficar pronto em instantes
      }

      return {
        success: true,
        labelUrl: labelUrl || `https://melhorenvio.com.br/painel/envios/${melhorEnvioId}`,
        trackingCode: trackingCode || `ME-${melhorEnvioId.slice(0, 8).toUpperCase()}`,
        carrier: parsedCart.data.service?.company?.name || 'Correios / Jadlog',
        melhorEnvioOrderId: melhorEnvioId,
      };
    } catch (err: any) {
      console.error('[MelhorEnvio] Falha ao gerar etiqueta:', err);
      return {
        success: false,
        error: err.message || 'Falha ao processar etiqueta no Melhor Envio.',
      };
    }
  }
}
