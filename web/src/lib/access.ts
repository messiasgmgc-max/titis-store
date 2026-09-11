// Regra única de acesso à consultoria digital (espelhada em public.has_consulting_access() no SQL).
import type { Profile } from './types';

type AccessProfile = Pick<Profile, 'role' | 'access_until'> | null | undefined;

/** Admin sempre; VIP enquanto access_until for nulo (vitalício) ou futuro. */
export function hasConsultingAccess(profile: AccessProfile, now: Date = new Date()): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.role !== 'vip') return false;
  if (!profile.access_until) return true;
  return new Date(profile.access_until).getTime() > now.getTime();
}

/** Dias restantes de acesso (null = sem prazo ou sem acesso). */
export function accessDaysLeft(profile: AccessProfile, now: Date = new Date()): number | null {
  if (!profile?.access_until || !hasConsultingAccess(profile, now)) return null;
  const ms = new Date(profile.access_until).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
