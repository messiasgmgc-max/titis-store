// ============================================================
// Trava da consultoria paga — somente servidor.
// Valida o token Bearer, lê o perfil com as permissões do próprio usuário
// (RLS) e aplica a mesma regra do front: src/lib/access.ts → hasConsultingAccess.
// ============================================================
import type { User } from '@supabase/supabase-js';
import { hasConsultingAccess } from '@/lib/access';
import type { PlanId, Role } from '@/lib/types';
import { jsonError } from './http';
import { bearerToken, createServerSupabase } from './supabase-server';

export interface ConsultingProfile {
  role: Role;
  plan: PlanId | null;
  access_until: string | null;
}

export interface ConsultingContext {
  user: User;
  profile: ConsultingProfile;
  token: string;
}

const UNAUTHORIZED = 'Entre na sua conta para usar a consultoria.';
const PAYMENT_REQUIRED = 'Sua consultoria precisa de um plano ativo.';

const ROLES = new Set<string>(['client', 'vip', 'admin']);
const PLANS = new Set<string>(['passe', 'clube', 'presencial']);

function toProfile(row: unknown): ConsultingProfile | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  return {
    role: typeof r.role === 'string' && ROLES.has(r.role) ? (r.role as Role) : 'client',
    plan: typeof r.plan === 'string' && PLANS.has(r.plan) ? (r.plan as PlanId) : null,
    access_until: typeof r.access_until === 'string' && r.access_until ? r.access_until : null,
  };
}

/**
 * Exige sessão válida e acesso ativo à consultoria (admin; ou VIP dentro do prazo).
 * Devolve o contexto ou uma Response 401 (sem sessão), 402 (sem plano) ou 502 (falha ao verificar).
 */
export async function requireConsultingAccess(req: Request): Promise<ConsultingContext | Response> {
  const token = bearerToken(req);
  if (!token) return jsonError(401, 'unauthorized', UNAUTHORIZED);

  const client = createServerSupabase(token);
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return jsonError(401, 'unauthorized', UNAUTHORIZED);

    const { data: row, error: profileError } = await client
      .from('profiles')
      .select('role, plan, access_until')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      const hint = profileError.code === '42703' ? ' (rode supabase/schema.sql: colunas plan/access_until ausentes)' : '';
      console.error(`[access] não foi possível ler o perfil${hint} — ${profileError.message.slice(0, 200)}`);
      return jsonError(502, 'upstream', 'Não foi possível verificar seu acesso agora. Tente novamente em instantes.');
    }

    const profile = toProfile(row);
    if (!profile || !hasConsultingAccess(profile)) {
      return jsonError(402, 'payment_required', PAYMENT_REQUIRED);
    }
    return { user: data.user, profile, token };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[access] falha ao validar sessão — ${message.slice(0, 200)}`);
    return jsonError(502, 'upstream', 'Não foi possível verificar seu acesso agora. Tente novamente em instantes.');
  }
}
