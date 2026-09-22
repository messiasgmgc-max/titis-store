// ============================================================
// GET /feed.xml — Alias para o Feed de Produtos Meta / Google
// ============================================================
import { GET as getFeed } from '@/app/api/feed/instagram/route';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  return getFeed();
}
