import { NextResponse } from 'next/server';
import { corsOptions, withCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const OPTIONS = corsOptions;

// Unlike /api/health, the proxy requires the configured access token here.
export function GET() {
    return withCors(NextResponse.json({ ok: true, service: 'Agenda+' }));
}
