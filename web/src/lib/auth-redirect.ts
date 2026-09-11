// Destino único depois de entrar na conta: quem já pagou cai na consultoria,
// quem ainda não tem plano cai na aba "Meu plano" da conta, admin vai ao painel.
import { supabase } from './supabaseClient';
import { hasConsultingAccess } from './access';
import { CONSULTING_PATH } from './site';
import type { Profile } from './types';

/** Aba da conta onde o cliente gerencia (ou contrata) o plano. */
export const PLAN_TAB_PATH = '/dashboard?aba=plano';

type AccessProfile = Pick<Profile, 'role' | 'access_until'> & Partial<Pick<Profile, 'is_blocked'>>;

/** Aceita apenas caminhos internos relativos (nunca /login nem URLs externas). */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return null;
  if (/^\/login(\/|\?|#|$)/.test(path)) return null;
  return path;
}

/**
 * Para onde levar o usuário logo após entrar.
 * next válido → next · admin → /admin · com acesso → /consultoria · sem acesso → /dashboard?aba=plano
 */
export function postLoginPath(profile: AccessProfile | null | undefined, next?: string | null): string {
  const safe = safeNextPath(next);
  if (safe) return safe;
  if (profile?.role === 'admin') return '/admin';
  if (hasConsultingAccess(profile)) return CONSULTING_PATH;
  return PLAN_TAB_PATH;
}

/**
 * Versão assíncrona para o instante seguinte ao login, quando o SessionProvider
 * ainda não recebeu o perfil: lê a sessão e o perfil direto do Supabase.
 */
export async function resolvePostLoginPath(next?: string | null): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return postLoginPath(null, next);
    const { data: row } = await supabase
      .from('profiles')
      .select('role, access_until, is_blocked')
      .eq('id', user.id)
      .maybeSingle();
    return postLoginPath((row as AccessProfile | null) ?? null, next);
  } catch {
    return postLoginPath(null, next);
  }
}
