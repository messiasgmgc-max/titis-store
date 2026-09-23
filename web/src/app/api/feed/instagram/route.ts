// ============================================================
// GET /api/feed/instagram — Feed de Catálogo Meta (Facebook / Instagram Shopping)
// Formato: RSS 2.0 XML (Google Merchant / Meta Catalog)
// ============================================================
import { generateCatalogFeedResponse } from '@/lib/server/feed';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  return generateCatalogFeedResponse();
}

