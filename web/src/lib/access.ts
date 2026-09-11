// Regra única de acesso à consultoria digital (espelhada em public.has_consulting_access() no SQL).
import type { Profile } from './types';

type AccessProfile = Pick<Profile, 'role' | 'access_until'> & Partial<Pick<Profile, 'is_blocked'>>;
type MaybeProfile = AccessProfile | null | undefined;

/** Admin sempre; VIP não bloqueado enquanto access_until for nulo (sem prazo) ou futuro. */
export function hasConsultingAccess(profile: MaybeProfile, now: Date = new Date()): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.is_blocked) return false;
  if (profile.role !== 'vip') return false;
  if (!profile.access_until) return true;
  return new Date(profile.access_until).getTime() > now.getTime();
}

/** Dias restantes de acesso (null = sem prazo ou sem acesso). */
export function accessDaysLeft(profile: MaybeProfile, now: Date = new Date()): number | null {
  if (!profile?.access_until || !hasConsultingAccess(profile, now)) return null;
  const ms = new Date(profile.access_until).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export type AccessState = 'admin' | 'blocked' | 'active' | 'expired' | 'none';

/** Situação resumida do acesso, para etiquetas na conta e no admin. */
export function accessState(profile: MaybeProfile, now: Date = new Date()): AccessState {
  if (!profile) return 'none';
  if (profile.role === 'admin') return 'admin';
  if (profile.is_blocked) return 'blocked';
  if (profile.role !== 'vip') return 'none';
  return hasConsultingAccess(profile, now) ? 'active' : 'expired';
}
