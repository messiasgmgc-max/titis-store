// ============================================================
// GET /auth/callback — Callback de Autenticação Supabase (PKCE & Email Confirm)
// Troca o código por sessão e redireciona o usuário para o destino pretendido
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next') || url.searchParams.get('redirect_to') || '/dashboard';

  // Sanitiza o destino para evitar open redirects
  let nextPath = '/dashboard';
  if (rawNext.startsWith('/')) {
    nextPath = rawNext;
  } else {
    try {
      const parsed = new URL(rawNext);
      if (parsed.hostname.endsWith('titisstore.com.br') || parsed.hostname.includes('localhost')) {
        nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      nextPath = '/dashboard';
    }
  }

  if (code) {
    try {
      const supabase = createServerSupabase();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.warn('[auth/callback] Falha ao trocar code por sessão no servidor:', err);
    }
  }

  // Redireciona para o destino final no mesmo domínio
  const origin = url.origin;
  return NextResponse.redirect(new URL(nextPath, origin));
}
