import { NextResponse } from 'next/server';
import { testNtfyConnection } from '@/lib/server/ntfy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await testNtfyConnection({
      serverUrl: body.serverUrl,
      topic: body.topic,
      token: body.token,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
