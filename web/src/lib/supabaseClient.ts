// ============================================================
// SUPABASE CLIENT COM SSO ENTRE SUBDOMÍNIOS (.titisstore.com.br)
// ============================================================
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dusavcbgomdosfjodups.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh';

/** Adapter para compartilhar a sessão de login entre loja e consultor */
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + encodeURIComponent(key) + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;
    const hostname = window.location.hostname;
    const domain = hostname.endsWith('titisstore.com.br') ? '; domain=.titisstore.com.br' : '';
    document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(value)}; path=/${domain}; max-age=${60 * 60 * 24 * 365}; SameSite=Lax; secure`;
  },
  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;
    const hostname = window.location.hostname;
    const domain = hostname.endsWith('titisstore.com.br') ? '; domain=.titisstore.com.br' : '';
    document.cookie = `${encodeURIComponent(key)}=; path=/${domain}; max-age=0; SameSite=Lax; secure`;
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window !== 'undefined' ? cookieStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
