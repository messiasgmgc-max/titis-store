// ============================================================
// GET /api/feed/csv — Feed de Produtos Meta / Google em CSV
// ============================================================
import { generateCatalogCsvResponse } from '@/lib/server/feed';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  return generateCatalogCsvResponse();
}
