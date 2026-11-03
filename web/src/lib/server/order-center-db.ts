import 'server-only';
import { createServiceSupabase } from './mercadopago';

// A fábrica antiga pode cair em chave anônima; a central nunca deve retornar uma lista
// vazia por falta de privilégio e as credenciais do push exigem service_role.
export function createOrderServiceSupabase() {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  if (!key) throw new Error('Configure a chave de serviço do Supabase no servidor.');
  return createServiceSupabase();
}
