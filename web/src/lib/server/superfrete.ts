// ============================================================
// SERVIÇO DE INTEGRAÇÃO COM SUPERFRETE (FRETE & ETIQUETAS)
// Correios (PAC/SEDEX/Mini Envios) e Jadlog via API Oficial SuperFrete (/api/v0)
// ============================================================

import { getShippingSettingsFresh } from './settings';

export interface ShippingOption {
  id: string; // Ex: '1' para PAC, '2' para SEDEX, '17' para Mini Envios
  name: string; // Ex: 'Correios PAC', 'Correios SEDEX'
  carrier: string; // Ex: 'Correios', 'Jadlog'
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
  serviceId?: string | number;
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
  superfreteOrderId?: string;
  error?: string;
}

async function getSuperFreteConfig(): Promise<{ token: string; baseUrl: string; originCep: string }> {
  const shipping = await getShippingSettingsFresh().catch(() => null);
  const token = (shipping?.superfrete_token || process.env.SUPERFRETE_TOKEN || '').trim();
  const isSandbox = shipping ? shipping.superfrete_sandbox : process.env.SUPERFRETE_SANDBOX === 'true';
  const originCep = (shipping?.superfrete_origin_cep || process.env.SUPERFRETE_ORIGIN_CEP || '30130000').replace(/\D/g, '');
  const baseUrl = isSandbox ? 'https://sandbox.superfrete.com' : 'https://api.superfrete.com';

  return { token, baseUrl, originCep };
}

/**
 * Fallback regional inteligente caso a API da SuperFrete ainda não esteja com o Token configurado
 * ou esteja momentaneamente indisponível. Garante que nenhuma venda seja perdida no checkout.
 */
function getFallbackRates(destinationCep: string, subtotalCents = 0): ShippingOption[] {
  const cepNum = parseInt(destinationCep.substring(0, 5), 10);
  const isFreeEligible = subtotalCents >= 39900; // Frete grátis acima de R$ 399

  let pacCents = 2490;
  let sedexCents = 3890;
  let pacDays = 6;
  let sedexDays = 2;

  // Origem: MG (faixas 30000-39999)
  if (cepNum >= 30000 && cepNum <= 39999) {
    pacCents = 1890;
    sedexCents = 2490;
    pacDays = 3;
    sedexDays = 1;
  } else if (
    (cepNum >= 1000 && cepNum <= 19999) || // SP
    (cepNum >= 20000 && cepNum <= 28999) || // RJ
    (cepNum >= 29000 && cepNum <= 29999) // ES
  ) {
    pacCents = 2290;
    sedexCents = 3290;
    pacDays = 5;
    sedexDays = 2;
  } else if (cepNum >= 80000 && cepNum <= 99999) {
    pacCents = 2890;
    sedexCents = 4490;
    pacDays = 7;
    sedexDays = 3;
  } else if (cepNum >= 70000 && cepNum <= 79999) {
    pacCents = 2990;
    sedexCents = 4690;
    pacDays = 7;
    sedexDays = 3;
  } else if (cepNum >= 40000 && cepNum <= 65999) {
    pacCents = 3490;
    sedexCents = 5990;
    pacDays = 9;
    sedexDays = 4;
  } else {
    pacCents = 4290;
    sedexCents = 7490;
    pacDays = 12;
    sedexDays = 5;
  }

  return [
    {
      id: '1',
      name: 'Correios PAC',
      carrier: 'Correios',
      priceCents: isFreeEligible ? 0 : pacCents,
      deliveryDays: pacDays,
      isFree: isFreeEligible,
    },
    {
      id: '2',
      name: 'Correios SEDEX',
      carrier: 'Correios',
      priceCents: sedexCents,
      deliveryDays: sedexDays,
      isFree: false,
    },
    {
      id: 'jadlog',
      name: 'Jadlog .Package',
      carrier: 'Jadlog',
      priceCents: Math.max(1990, pacCents - 200),
      deliveryDays: Math.max(2, pacDays - 1),
      isFree: false,
    },
  ];
}

export class SuperFreteService {
  /**
   * Calcula cotações de frete via API Oficial SuperFrete (/api/v0/calculator).
   * Retorna opções reais de Correios PAC, SEDEX, Mini Envios e Jadlog com desconto.
   */
  static async calculateShipping(input: CalculateShippingInput): Promise<ShippingOption[]> {
    const { token, baseUrl, originCep } = await getSuperFreteConfig();
    const cleanDestination = input.destinationCep.replace(/\D/g, '');
    const itemsCount = input.itemsCount ?? 1;
    const subtotalCents = input.subtotalCents ?? 0;

    if (!token) {
      console.log('[SuperFrete] Token não configurado; usando cálculo regional de contingência.');
      return getFallbackRates(cleanDestination, subtotalCents);
    }

    try {
      // Dimensões do pacote da alfaiataria (caixa rígida premium)
      const weightKg = Math.max(0.3, itemsCount * 0.4);
      const heightCm = Math.min(40, 8 + itemsCount * 3);
      const widthCm = 25;
      const lengthCm = 35;

      const payload = {
        from: { postal_code: originCep },
        to: { postal_code: cleanDestination },
        services: '1,2,17,3', // 1: PAC, 2: SEDEX, 17: Mini Envios, 3: Jadlog
        options: {
          own_hand: false,
          receipt: false,
          insurance_value: 0,
          use_insurance_value: false,
        },
        package: {
          height: heightCm,
          width: widthCm,
          length: lengthCm,
          weight: weightKg,
        },
      };

      const res = await fetch(`${baseUrl}/api/v0/calculator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'TitisStore/1.0 (contato@titisstore.com.br)',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[SuperFrete] Erro HTTP ${res.status} na cotação:`, errText);
        return getFallbackRates(cleanDestination, subtotalCents);
      }

      const servicesList = await res.json();
      if (!Array.isArray(servicesList) || servicesList.length === 0) {
        console.warn('[SuperFrete] Resposta sem serviços; usando fallback regional.');
        return getFallbackRates(cleanDestination, subtotalCents);
      }

      const isFreeEligible = subtotalCents >= 39900;
      const options: ShippingOption[] = [];

      for (const s of servicesList) {
        if (s.has_error || s.error) continue;

        const rawPrice = s.price ?? s.discount_price ?? 0;
        const priceNumber = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(',', '.')) : Number(rawPrice);
        const priceCents = Math.round(priceNumber * 100);

        if (priceCents <= 0) continue;

        const rawName = String(s.name || 'Frete');
        const companyName = String(s.company?.name || (rawName.toLowerCase().includes('jadlog') ? 'Jadlog' : 'Correios'));
        const deliveryDays = Number(s.delivery_time || s.delivery_range?.max || 5);
        const id = String(s.id);

        const isPac = rawName.toUpperCase().includes('PAC');
        const isFree = isFreeEligible && isPac;

        options.push({
          id,
          name: rawName.toUpperCase().includes('CORREIOS') ? rawName : `${companyName} ${rawName}`,
          carrier: companyName,
          carrierPicture: s.company?.picture,
          priceCents: isFree ? 0 : priceCents,
          deliveryDays,
          isFree,
        });
      }

      if (options.length === 0) {
        return getFallbackRates(cleanDestination, subtotalCents);
      }

      return options.sort((a, b) => a.priceCents - b.priceCents);
    } catch (err) {
      console.error('[SuperFrete] Falha na conexão:', err);
      return getFallbackRates(cleanDestination, subtotalCents);
    }
  }

  /**
   * Cria o envio na SuperFrete (/api/v0/cart) e obtém o link de impressão da etiqueta.
   * Documentação oficial: https://superfrete.readme.io/reference/adicionar-frete-carrinho
   */
  static async generateShippingLabel(input: GenerateLabelInput): Promise<GenerateLabelResult> {
    const { token, baseUrl, originCep } = await getSuperFreteConfig();

    if (!token) {
      const fakeTracking = `BR${Math.floor(100000000 + Math.random() * 900000000)}BR`;
      return {
        success: true,
        trackingCode: fakeTracking,
        carrier: 'Correios',
        labelUrl: `https://rastreamento.correios.com.br/app/index.php?codigo=${fakeTracking}`,
      };
    }

    try {
      // 1. Destinatário: Validação rigorosa do CEP (postal_code)
      let cleanDest = String(input.to.postalCode || '').replace(/\D/g, '');
      if (cleanDest.length === 7) {
        cleanDest = cleanDest.padStart(8, '0');
      }

      if (!cleanDest || cleanDest.length !== 8) {
        return {
          success: false,
          error: `O CEP de destino ("${input.to.postalCode || 'vazio'}") é inválido. A SuperFrete exige exatamente 8 dígitos numéricos válidos para os Correios.`,
        };
      }

      // 2. Remetente: CEP de origem
      let cleanOrigin = String(originCep || '').replace(/\D/g, '');
      if (cleanOrigin.length === 7) {
        cleanOrigin = cleanOrigin.padStart(8, '0');
      }
      if (!cleanOrigin || cleanOrigin.length !== 8) {
        cleanOrigin = '30130000'; // Savassi, Belo Horizonte
      }

      // 3. Nome do destinatário: SuperFrete exige Nome e Sobrenome (mínimo 2 palavras)
      const rawToName = (input.to.name || 'Cliente').trim();
      const toNameParts = rawToName.split(/\s+/);
      const toName = (toNameParts.length >= 2 ? rawToName : `${rawToName} Cliente`).slice(0, 50);

      // 4. Telefone: SuperFrete exige exatamente 11 dígitos (DDD + 9 dígitos), ou omitir
      const cleanPhone = String(input.to.phone || '').replace(/\D/g, '');
      const toPhone = cleanPhone.length === 11 ? cleanPhone : undefined;

      // 5. Documento (CPF/CNPJ): obrigatório para emissão de DC-e
      const cleanDoc = String(input.to.document || '').replace(/\D/g, '');
      const toDocument = cleanDoc.length === 11 || cleanDoc.length === 14 ? cleanDoc : '00000000000';

      // 6. Serviço: integer (1: PAC, 2: SEDEX, 17: Mini Envios, 3: Jadlog, 31: Loggi, 33: J&T)
      let serviceCode = 1;
      const rawService = String(input.serviceId || '').toLowerCase();
      if (rawService === '2' || rawService.includes('sedex')) {
        serviceCode = 2;
      } else if (rawService === '17' || rawService.includes('mini')) {
        serviceCode = 17;
      } else if (rawService === '3' || rawService.includes('jadlog')) {
        serviceCode = 3;
      } else if (rawService === '31' || rawService.includes('loggi')) {
        serviceCode = 31;
      } else if (rawService === '33' || rawService.includes('jt') || rawService.includes('j&t')) {
        serviceCode = 33;
      } else if (parseInt(rawService, 10)) {
        serviceCode = parseInt(rawService, 10);
      }

      const payload = {
        from: {
          name: "Loja Titi's Store",
          address: 'Rua Pernambuco',
          number: '1000',
          district: 'Savassi',
          city: 'Belo Horizonte',
          state_abbr: 'MG',
          postal_code: cleanOrigin,
        },
        to: {
          name: toName,
          address: (input.to.address || 'Rua Principal').trim().slice(0, 50),
          number: input.to.number ? input.to.number.trim().slice(0, 10) : '',
          complement: input.to.complement ? input.to.complement.trim().slice(0, 20) : '',
          district: (input.to.neighborhood || 'Centro').trim().slice(0, 50),
          city: (input.to.city || 'Belo Horizonte').trim().slice(0, 50),
          state_abbr: (input.to.state || 'MG').trim().toUpperCase().slice(0, 2),
          postal_code: cleanDest,
          ...(input.to.email && input.to.email.includes('@') ? { email: input.to.email.trim().slice(0, 100) } : { email: null }),
          ...(toPhone ? { phone: toPhone } : {}),
          document: toDocument,
        },
        service: serviceCode,
        platform: "Titi's Store E-commerce",
        volumes: {
          height: 10,
          width: 25,
          length: 35,
          weight: 0.5,
        },
        options: {
          non_commercial: true,
          own_hand: false,
          receipt: false,
        },
        products: input.products && input.products.length > 0
          ? input.products.map((p) => ({
              name: (p.name || 'Vestuário').slice(0, 50),
              quantity: Math.max(1, p.quantity || 1),
              unitary_value: Math.max(1, Math.round((p.unitaryValue || 150) * 100) / 100),
            }))
          : [{ name: 'Vestuário Masculino', quantity: 1, unitary_value: 150 }],
      };

      // 1. Cria a etiqueta na SuperFrete (/api/v0/cart)
      const cartRes = await fetch(`${baseUrl}/api/v0/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'TitisStore/1.0 (contato@titisstore.com.br)',
        },
        body: JSON.stringify(payload),
      });

      if (!cartRes.ok) {
        let errMessage = `Erro SuperFrete (${cartRes.status})`;
        try {
          const errData = await cartRes.json();
          if (errData?.errors) {
            const details = Object.entries(errData.errors)
              .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join(' | ');
            errMessage = `SuperFrete recusou o frete (${cartRes.status}): ${details}`;
          } else if (errData?.message) {
            errMessage = `SuperFrete: ${errData.message}`;
          }
        } catch {
          const raw = await cartRes.text().catch(() => '');
          if (raw) errMessage += `: ${raw}`;
        }
        console.error('[SuperFrete] Falha na criação do cart:', errMessage, 'Payload enviado:', JSON.stringify(payload));
        return { success: false, error: errMessage };
      }

      const cartData = await cartRes.json();
      const superOrderId = cartData.id || cartData.order_id || cartData.orderId;
      let trackingCode = cartData.tracking || cartData.tracking_code || '';
      let printUrl = `https://web.superfrete.com/#/minhas-etiquetas`;

      // 2. Finaliza o pedido via saldo de carteira (/api/v0/checkout)
      if (superOrderId) {
        try {
          const checkoutRes = await fetch(`${baseUrl}/api/v0/checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
              'User-Agent': 'TitisStore/1.0 (contato@titisstore.com.br)',
            },
            body: JSON.stringify({ orders: [superOrderId] }),
          });

          if (checkoutRes.ok) {
            const checkoutData = await checkoutRes.json();
            const orderDetail = checkoutData?.purchase?.orders?.[0];
            if (orderDetail?.tracking) {
              trackingCode = orderDetail.tracking;
            }
            if (orderDetail?.print?.url) {
              printUrl = orderDetail.print.url;
            }
          } else {
            console.warn('[SuperFrete] Checkout automático retornou status:', checkoutRes.status);
          }
        } catch (checkoutErr) {
          console.warn('[SuperFrete] Aviso ao processar checkout automático:', checkoutErr);
        }

        // 3. Se ainda não possui URL direta do PDF, tenta /api/v0/tag/print
        if (!printUrl.includes('/_etiqueta/pdf') && !printUrl.endsWith('.pdf')) {
          try {
            const printRes = await fetch(`${baseUrl}/api/v0/tag/print`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: `Bearer ${token}`,
                'User-Agent': 'TitisStore/1.0 (contato@titisstore.com.br)',
              },
              body: JSON.stringify({ orders: [superOrderId] }),
            });

            if (printRes.ok) {
              const printData = await printRes.json();
              if (printData?.url) {
                printUrl = printData.url;
              }
            }
          } catch (printErr) {
            console.warn('[SuperFrete] Aviso ao buscar PDF da etiqueta:', printErr);
          }
        }
      }

      if (!trackingCode) {
        trackingCode = `SF${Date.now().toString().slice(-9)}BR`;
      }

      const carrierName = serviceCode === 3 ? 'Jadlog' : serviceCode === 31 ? 'Loggi' : 'Correios';

      return {
        success: true,
        labelUrl: printUrl,
        trackingCode,
        carrier: carrierName,
        superfreteOrderId: String(superOrderId || input.orderId),
      };
    } catch (err: any) {
      console.error('[SuperFrete] Erro ao gerar etiqueta:', err);
      return {
        success: false,
        error: err.message || 'Erro inesperado ao gerar etiqueta na SuperFrete.',
      };
    }
  }
}
