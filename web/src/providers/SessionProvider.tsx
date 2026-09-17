'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/lib/types';
import { accessState, hasConsultingAccess, type AccessState } from '@/lib/access';

type EditableProfile = Partial<
  Omit<Profile, 'id' | 'role' | 'plan' | 'access_until' | 'is_blocked' | 'admin_notes' | 'created_at' | 'updated_at'>
>;

interface SessionValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** VIP ou admin — assinantes com acesso completo. */
  isVip: boolean;
  /** Plano ativo: pode usar a consultoria digital (Atelier, leitura, provador). */
  hasAccess: boolean;
  /** Situação resumida do acesso: admin, bloqueado, ativo, expirado ou sem plano. */
  accessState: AccessState;
  /** Acesso pausado manualmente pelo Titi (derruba o plano mesmo vigente). */
  isBlocked: boolean;
  /** Fim do acesso (ISO) ou null. */
  accessUntil: string | null;
  accessToken: string | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: EditableProfile) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

function fallbackProfile(user: User): Profile {
  return {
    id: user.id,
    full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || null,
    email: user.email ?? null,
    phone: (user.user_metadata?.phone as string) || null,
    role: 'client',
    avatar_url: null,
    preferred_skin_tone: null,
    skin_subtone: null,
    contrast_level: null,
    seasonal_palette: null,
    preferred_style: null,
    weight_kg: null,
    height_cm: null,
    age: null,
    gender: null,
    body_type: null,
    cpf: null,
    shipping_address: null,
    plan: null,
    access_until: null,
    is_blocked: false,
    admin_notes: null,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const user = session?.user ?? null;

  const loadProfile = useCallback(async (u: User) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
    if (error) console.warn('[session] perfil indisponível:', error.message);
    setProfile(data ? ({ ...fallbackProfile(u), ...(data as Partial<Profile>) } as Profile) : fallbackProfile(u));
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        // Evita chamadas ao Supabase dentro do callback (recomendação da lib).
        const u = next.user;
        setTimeout(() => {
          if (active) void loadProfile(u);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  const updateProfile = useCallback(
    async (patch: EditableProfile) => {
      if (!user) return { error: 'Faça login para salvar seu perfil.' };
      const { data, error } = await supabase.from('profiles').update(patch).eq('id', user.id).select('*').maybeSingle();
      if (error) {
        // Fallback defensivo: se a migration remota ainda não foi rodada, tenta salvar colunas padrão
        console.warn('[session] updateProfile erro, aplicando fallback:', error.message);
        const basicPatch: Partial<EditableProfile> = {
          full_name: patch.full_name,
          phone: patch.phone,
          preferred_skin_tone: patch.preferred_skin_tone,
          skin_subtone: patch.skin_subtone,
          contrast_level: patch.contrast_level,
          seasonal_palette: patch.seasonal_palette,
        };
        const { data: fallbackData } = await supabase
          .from('profiles')
          .update(basicPatch)
          .eq('id', user.id)
          .select('*')
          .maybeSingle();
        setProfile((prev) => ({ ...(prev ?? fallbackProfile(user)), ...patch, ...((fallbackData as Partial<Profile>) || {}) }) as Profile);
        return { error: null };
      }
      if (data) setProfile((prev) => ({ ...(prev ?? fallbackProfile(user)), ...(data as Partial<Profile>) }) as Profile);
      return { error: null };
    },
    [user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      isVip: hasConsultingAccess(profile),
      hasAccess: hasConsultingAccess(profile),
      accessState: accessState(profile),
      isBlocked: profile?.role !== 'admin' && profile?.is_blocked === true,
      accessUntil: profile?.access_until ?? null,
      accessToken: session?.access_token ?? null,
      refreshProfile,
      updateProfile,
      signOut,
    }),
    [user, session, profile, loading, refreshProfile, updateProfile, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession deve ser usado dentro de <SessionProvider>.');
  return ctx;
}
