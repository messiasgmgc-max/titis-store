// ============================================================
// SERVIÇO DE E-MAILS TRANSACIONAIS — TITI'S STORE & CONSULTOR
// Suporte nativo a Resend API (HTTP) ou registro em log quando não configurado.
// Templates de altíssimo padrão: Obsidian, Champagne Gold, Ivory.
// ============================================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

function getApiKey(): string {
  return (process.env.RESEND_API_KEY ?? '').trim();
}

function getDefaultFrom(): string {
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Titi's Store <contato@titisstore.com.br>"
  );
}

/** Formata centavos em moeda Real brasileiro */
function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Layout base HTML elegante com a identidade visual da Titi's Store */
function baseTemplate(contentHtml: string, title = "Titi's Store"): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0d0e;
      color: #f6f5f1;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0d0e;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #171719;
      border: 1px solid #2b261e;
      border-radius: 16px;
      overflow: hidden;
    }
    .header {
      padding: 32px 32px 24px;
      text-align: center;
      border-bottom: 1px solid #23201a;
      background: linear-gradient(180deg, rgba(200, 162, 88, 0.08) 0%, rgba(23, 23, 25, 0) 100%);
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #d4af37;
      text-decoration: none;
    }
    .subtitle {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #9e9ea6;
      margin-top: 4px;
    }
    .content {
      padding: 32px;
      line-height: 1.6;
      color: #dedcd4;
      font-size: 14px;
    }
    .highlight-card {
      background-color: #0d0d0e;
      border: 1px solid #2b261e;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #e6ca65 0%, #c99a2c 100%);
      color: #0d0d0e !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 9999px;
      text-align: center;
      margin: 16px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .items-table th {
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #9e9ea6;
      padding-bottom: 8px;
      border-bottom: 1px solid #2b261e;
    }
    .items-table td {
      padding: 12px 0;
      border-bottom: 1px solid #1f1f23;
      font-size: 13px;
    }
    .footer {
      padding: 24px 32px;
      background-color: #121214;
      text-align: center;
      font-size: 11px;
      color: #6b6a72;
      border-top: 1px solid #23201a;
    }
    .code-box {
      font-family: monospace;
      background-color: #050505;
      border: 1px dashed #c99a2c;
      color: #e6ca65;
      padding: 12px;
      border-radius: 8px;
      word-break: break-all;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="brand">TITI'S STORE</div>
        <div class="subtitle">Alta Alfaiataria & Consultoria de Imagem</div>
      </div>
      <div class="content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p>© ${year} Titi's Store — Todos os direitos reservados.</p>
        <p>Belo Horizonte / MG · Atendimento exclusivo via WhatsApp</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export class EmailService {
  /** Envia e-mail via Resend API (HTTP puro, sem dependências externas) */
  static async send(options: EmailOptions): Promise<boolean> {
    const apiKey = getApiKey();
    const from = options.from || getDefaultFrom();
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    if (!apiKey) {
      console.log("[EmailService] RESEND_API_KEY não configurada; e-mail em log:", {
        to: recipients,
        subject: options.subject,
      });
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: options.subject,
          html: options.html,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[EmailService] Falha no disparo Resend (${response.status}):`, errorText);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[EmailService] Erro ao conectar com Resend:', err);
      return false;
    }
  }

  /** E-mail 1: Pedido Criado com Pix Gerado */
  static async sendOrderPixGenerated(data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    amountCents: number;
    items?: Array<{ name: string; quantity: number; priceCents?: number; size?: string }>;
    pixCode?: string;
  }): Promise<boolean> {
    const totalBrl = formatCurrency(data.amountCents);
    const itemsListHtml = (data.items || [])
      .map(
        (i) => `<tr>
          <td>
            <strong>${i.name}</strong>
            ${i.size ? `<span style="color:#9e9ea6; font-size:11px;"> · Tam: ${i.size}</span>` : ''}
          </td>
          <td style="text-align:center;">${i.quantity}x</td>
          <td style="text-align:right; color:#d4af37;">${i.priceCents ? formatCurrency(i.priceCents * i.quantity) : ''}</td>
        </tr>`
      )
      .join('');

    const html = baseTemplate(
      `
      <h2 style="color:#f6f5f1; font-size:20px; margin-top:0;">Pedido #${data.orderId} Recebido!</h2>
      <p>Olá, <strong>${data.customerName}</strong>.</p>
      <p>Seu pedido foi registrado em nossa alfaiataria. Para finalizar e garantir suas peças, realize o pagamento via Pix no valor de <strong style="color:#d4af37;">${totalBrl}</strong>.</p>
      
      ${
        data.pixCode
          ? `
          <div class="highlight-card" style="text-align:center;">
            <p style="font-size:12px; color:#9e9ea6; margin-top:0;">CHAVE PIX COPIA E COLA:</p>
            <div class="code-box">${data.pixCode}</div>
            <p style="font-size:11px; color:#9e9ea6; margin-bottom:0; margin-top:8px;">Abra o app do seu banco e selecione "Pix Copia e Cola".</p>
          </div>
          `
          : ''
      }

      ${
        itemsListHtml
          ? `
          <h3 style="color:#e6ca65; font-size:14px; text-transform:uppercase; letter-spacing:0.08em; margin-top:24px;">Resumo das Peças:</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qtd</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>
          `
          : ''
      }

      <div style="border-top: 1px solid #2b261e; padding-top: 16px; margin-top: 16px; display:flex; justify-content:space-between;">
        <span>Total:</span>
        <strong style="color:#d4af37; font-size:16px;">${totalBrl}</strong>
      </div>

      <p style="margin-top:24px; font-size:12px; color:#9e9ea6;">
        Assim que o pagamento for concluído, nossa equipe confirmará imediatamente e iniciará a separação das suas peças.
      </p>
      `,
      `Pedido #${data.orderId} — Titi's Store`
    );

    return this.send({
      to: data.customerEmail,
      subject: `👑 Pedido #${data.orderId} registrado — Pagamento Pix · Titi's Store`,
      html,
    });
  }

  /** E-mail 2: Pagamento Aprovado / Pedido Confirmado */
  static async sendOrderPaymentConfirmed(data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    amountCents: number;
    items?: Array<{ name: string; quantity: number; priceCents?: number; size?: string }>;
    shippingAddress?: {
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      cep?: string;
    };
  }): Promise<boolean> {
    const totalBrl = formatCurrency(data.amountCents);
    const itemsListHtml = (data.items || [])
      .map(
        (i) => `<tr>
          <td>
            <strong>${i.name}</strong>
            ${i.size ? `<span style="color:#9e9ea6; font-size:11px;"> · Tam: ${i.size}</span>` : ''}
          </td>
          <td style="text-align:center;">${i.quantity}x</td>
          <td style="text-align:right; color:#d4af37;">${i.priceCents ? formatCurrency(i.priceCents * i.quantity) : ''}</td>
        </tr>`
      )
      .join('');

    const address = data.shippingAddress;
    const addressFormatted = address
      ? `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''} - ${address.neighborhood}, ${address.city}/${address.state} · CEP ${address.cep}`
      : 'Endereço registrado na compra';

    const html = baseTemplate(
      `
      <div style="text-align:center; margin-bottom:20px;">
        <span style="display:inline-block; padding:4px 12px; border-radius:9999px; background-color:rgba(52, 211, 153, 0.15); border:1px solid rgba(52, 211, 153, 0.4); color:#34d399; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">
          ✓ Pagamento Aprovado
        </span>
      </div>

      <h2 style="color:#f6f5f1; font-size:22px; margin-top:0; text-align:center;">Seu Pedido Está Confirmado!</h2>
      <p>Olá, <strong>${data.customerName}</strong>.</p>
      <p>Confirmamos o pagamento no valor de <strong style="color:#d4af37;">${totalBrl}</strong> para o pedido <strong>#${data.orderId}</strong>.</p>
      
      <p>Nossa equipe de alfaiataria já está cuidando da preparação das suas peças com rigoroso controle de acabamento e caimento.</p>

      ${
        itemsListHtml
          ? `
          <h3 style="color:#e6ca65; font-size:13px; text-transform:uppercase; letter-spacing:0.08em; margin-top:24px;">Itens do Pedido:</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Peça</th>
                <th style="text-align:center;">Qtd</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
          </table>
          `
          : ''
      }

      <div class="highlight-card">
        <h4 style="margin:0 0 8px; color:#e6ca65; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">Endereço de Entrega:</h4>
        <p style="margin:0; font-size:13px; color:#dedcd4;">${addressFormatted}</p>
      </div>

      <p style="margin-top:20px; font-size:13px; color:#9e9ea6;">
        Assim que o pacote for despachado, você receberá um e-mail e uma mensagem no WhatsApp com o código de rastreamento para acompanhar a entrega.
      </p>
      `,
      `Pagamento Confirmado — Pedido #${data.orderId}`
    );

    return this.send({
      to: data.customerEmail,
      subject: `👑 Pagamento Confirmado! Pedido #${data.orderId} · Titi's Store`,
      html,
    });
  }

  /** E-mail 3: Pedido Despachado / Enviado */
  static async sendOrderDispatched(data: {
    orderId: string;
    customerName: string;
    customerEmail: string;
    trackingCode: string;
    trackingCarrier?: string;
    trackingUrl?: string;
  }): Promise<boolean> {
    const carrier = data.trackingCarrier || 'Correios / Transportadora';
    const trackingLink =
      data.trackingUrl ||
      `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(data.trackingCode)}`;

    const html = baseTemplate(
      `
      <div style="text-align:center; margin-bottom:20px;">
        <span style="display:inline-block; padding:4px 12px; border-radius:9999px; background-color:rgba(212, 175, 55, 0.15); border:1px solid rgba(212, 175, 55, 0.4); color:#d4af37; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">
          📦 Pedido Despachado
        </span>
      </div>

      <h2 style="color:#f6f5f1; font-size:22px; margin-top:0; text-align:center;">Suas Peças Estão a Caminho!</h2>
      <p>Olá, <strong>${data.customerName}</strong>.</p>
      <p>Temos o prazer de informar que o seu pedido <strong>#${data.orderId}</strong> foi cuidadosamente embalado e despachado via <strong>${carrier}</strong>.</p>

      <div class="highlight-card" style="text-align:center;">
        <p style="font-size:12px; color:#9e9ea6; margin-top:0;">CÓDIGO DE RASTREAMENTO:</p>
        <div class="code-box" style="font-size:16px; font-weight:bold; letter-spacing:0.1em;">${data.trackingCode}</div>
        <div style="margin-top:16px;">
          <a href="${trackingLink}" target="_blank" class="btn">Rastrear Entrega</a>
        </div>
      </div>

      <p style="font-size:13px; color:#9e9ea6; text-align:center;">
        Lembramos que as atualizações no sistema da transportadora podem levar algumas horas para constar.
      </p>
      `,
      `Pedido #${data.orderId} Enviado!`
    );

    return this.send({
      to: data.customerEmail,
      subject: `📦 Pedido #${data.orderId} Despachado! Rastreie sua encomenda · Titi's Store`,
      html,
    });
  }

  /** E-mail 4: Consultor — Boas-Vindas e Acesso VIP Liberado */
  static async sendConsultingAccessGranted(data: {
    customerName: string;
    customerEmail: string;
    planName: string;
    accessUntil?: string;
  }): Promise<boolean> {
    const consultorUrl = process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br';

    const html = baseTemplate(
      `
      <div style="text-align:center; margin-bottom:20px;">
        <span style="display:inline-block; padding:4px 12px; border-radius:9999px; background-color:rgba(212, 175, 55, 0.15); border:1px solid rgba(212, 175, 55, 0.4); color:#d4af37; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">
          👑 Acesso VIP Ativado
        </span>
      </div>

      <h2 style="color:#f6f5f1; font-size:22px; margin-top:0; text-align:center;">Bem-vindo à Consultoria Titi's!</h2>
      <p>Olá, <strong>${data.customerName}</strong>.</p>
      <p>Sua assinatura do plano <strong>${data.planName}</strong> foi confirmada com sucesso!</p>
      <p>Agora você tem acesso irrestrito ao nosso <strong>Atelier Digital de Inteligência Artificial</strong> para realizar diagnósticos de colorimetria, análise de contraste facial e geração de looks sob medida.</p>

      <div style="text-align:center; margin:28px 0;">
        <a href="${consultorUrl}/consultoria" target="_blank" class="btn">Acessar Meu Atelier</a>
      </div>

      <div class="highlight-card">
        <h4 style="margin:0 0 8px; color:#e6ca65; font-size:12px; text-transform:uppercase; letter-spacing:0.08em;">O que você pode fazer agora:</h4>
        <ul style="margin:0; padding-left:20px; font-size:13px; color:#dedcd4;">
          <li>Fazer o scanner facial para descobrir sua cartela cromática exata.</li>
          <li>Compor looks personalizados para qualquer ocasião, clima e horário.</li>
          <li>Salvar combinações exclusivas no seu guarda-roupa virtual.</li>
        </ul>
      </div>
      `,
      "Acesso VIP Confirmado — Consultoria Titi's Store"
    );

    return this.send({
      to: data.customerEmail,
      subject: `👑 Seu acesso à Consultoria Titi's Store foi liberado!`,
      html,
    });
  }

  /** E-mail 5: Newsletter — Boas-Vindas e Cupom Exclusivo */
  static async sendNewsletterWelcome(data: {
    email: string;
    name?: string;
    source: 'store' | 'consultor';
  }): Promise<boolean> {
    const isStore = data.source === 'store';
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br').replace(/\/+$/, '');
    const couponCode = isStore ? 'TITIS10' : 'VIPCONSULTOR';

    const html = baseTemplate(
      `
      <div style="text-align:center; margin-bottom:20px;">
        <span style="display:inline-block; padding:4px 12px; border-radius:9999px; background-color:rgba(212, 175, 55, 0.15); border:1px solid rgba(212, 175, 55, 0.4); color:#d4af37; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em;">
          ✨ Círculo Privado
        </span>
      </div>

      <h2 style="color:#f6f5f1; font-size:22px; margin-top:0; text-align:center;">Bem-vindo ao Círculo Titi's</h2>
      <p>Olá${data.name ? `, <strong>${data.name}</strong>` : ''}!</p>
      <p>É uma honra ter você em nossa lista seleta. A partir de agora, você receberá em primeira mão lançamentos de coleções cápsula, insights sobre alfaiataria clássica e dicas de estilo masculino.</p>

      <div class="highlight-card" style="text-align:center;">
        <p style="font-size:12px; color:#9e9ea6; margin-top:0;">COMO BOAS-VINDAS, APROVEITE SEU CUPOM EXCLUSIVO:</p>
        <div class="code-box" style="font-size:18px; font-weight:bold; letter-spacing:0.15em;">${couponCode}</div>
        <p style="font-size:11px; color:#9e9ea6; margin-bottom:0; margin-top:8px;">Válido na finalização da sua próxima compra.</p>
        <div style="margin-top:16px;">
          <a href="${siteUrl}/colecao" target="_blank" class="btn">Explorar Coleção</a>
        </div>
      </div>
      `,
      "Bem-vindo ao Círculo Titi's Store"
    );

    return this.send({
      to: data.email,
      subject: `✨ Bem-vindo ao Círculo Titi's — Seu cupom exclusivo de boas-vindas`,
      html,
    });
  }
}
