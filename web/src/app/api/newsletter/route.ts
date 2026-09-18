// ============================================================
// POST /api/newsletter — Inscrição na Newsletter (Loja & Consultor)
// Salva o lead em newsletter_subscribers e envia e-mail com cupom de boas-vindas
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/server/mercadopago';
import { EmailService } from '@/lib/server/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source = 'store' } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = typeof name === 'string' ? name.trim() : undefined;
    const cleanSource: 'store' | 'consultor' = source === 'consultor' ? 'consultor' : 'store';

    const service = createServiceSupabase();

    // Insere ou atualiza o assinante no Supabase
    const { error: dbError } = await service
      .from('newsletter_subscribers')
      .upsert(
        {
          email: cleanEmail,
          name: cleanName || null,
          source: cleanSource,
          is_active: true,
        },
        { onConflict: 'email,source' }
      );

    if (dbError) {
      console.warn('[api/newsletter] Aviso ao salvar inscrito no banco:', dbError.message);
      // Se a tabela ainda não tiver sido criada no Supabase pelo usuário, não bloqueamos o fluxo
    }

    // Dispara e-mail automático de boas-vindas com cupom exclusivo
    EmailService.sendNewsletterWelcome({
      email: cleanEmail,
      name: cleanName,
      source: cleanSource,
    }).catch((err) => console.error('[api/newsletter] Erro no envio do e-mail:', err));

    return NextResponse.json({
      success: true,
      message: 'Bem-vindo ao Círculo Titi’s! Enviamos seu cupom exclusivo de boas-vindas por e-mail.',
    });
  } catch (err: any) {
    console.error('[api/newsletter] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao processar inscrição.' }, { status: 500 });
  }
}
