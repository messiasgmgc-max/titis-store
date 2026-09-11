// ============================================================
// Supabase no servidor — clientes sem sessão persistida e
// verificação de administrador a partir do token Bearer.
// ============================================================
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { jsonError } from './http';

// Mesmos valores públicos de src/lib/supabaseClient.ts (URL e chave publicável não são segredos).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dusavcbgomdosfjodups.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh';

/**
 * Cria um cliente para uso em rotas. Com `accessToken`, as consultas rodam
 * com as permissões (RLS) do usuário dono do token.
 */
export function createServerSupabase(accessToken?: string | null): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

/** Extrai o token de `Authorization: Bearer <token>`. */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  return token && token.length < 4096 ? token : null;
}

export interface AdminContext {
  user: User;
  accessToken: string;
}

/** Valida o token e exige `profiles.role = 'admin'`. Devolve o contexto ou uma Response 401/403. */
export async function requireAdmin(req: Request): Promise<AdminContext | Response> {
  const token = bearerToken(req);
  if (!token) return jsonError(401, 'unauthorized', 'Entre com uma conta de administrador para continuar.');

  const client = createServerSupabase(token);
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return jsonError(401, 'unauthorized', 'Sua sessão expirou. Entre novamente.');
    }

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    let isAdmin = !profileError && (profile as { role?: unknown } | null)?.role === 'admin';
    if (profileError) {
      // Plano B: função SQL public.is_admin() (usa auth.uid() do próprio token).
      const { data: rpc, error: rpcError } = await client.rpc('is_admin');
      if (rpcError) {
        console.error(`[auth] não foi possível verificar o papel do usuário — ${profileError.message}`);
        return jsonError(502, 'upstream', 'Não foi possível verificar suas permissões agora.');
      }
      isAdmin = rpc === true;
    }

    if (!isAdmin) return jsonError(403, 'forbidden', 'Este recurso é exclusivo da administração.');
    return { user: data.user, accessToken: token };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[auth] falha ao validar sessão — ${message.slice(0, 200)}`);
    return jsonError(502, 'upstream', 'Não foi possível verificar suas permissões agora.');
  }
}
