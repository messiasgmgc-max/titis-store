// ============================================================
// GET /catalog.csv — Feed de Produtos Meta / Google no formato CSV
// Compatibilidade nativa com Facebook & Instagram Commerce Manager
// ============================================================
import { generateCatalogCsvResponse } from '@/lib/server/feed';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  return generateCatalogCsvResponse();
}
