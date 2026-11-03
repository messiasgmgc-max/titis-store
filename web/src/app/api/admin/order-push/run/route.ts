import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { processOrderPush } from '@/lib/server/order-push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(req.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  try { return NextResponse.json(await processOrderPush(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'Falha ao processar avisos. Confira banco e configuração.' }, { status: 503 }); }
}
