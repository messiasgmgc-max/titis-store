// ============================================================
// GET /feed.xml — Alias para o Feed de Produtos Meta / Google
// ============================================================
import { generateCatalogFeedResponse } from '@/lib/server/feed';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  return generateCatalogFeedResponse();
}
