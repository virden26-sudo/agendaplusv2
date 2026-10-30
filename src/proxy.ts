import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders } from '@/lib/cors';

// Packaged Electron passes a per-launch secret to its loopback-only backend.
// Browser dev remains unchanged when no token is configured.
export function proxy(request: NextRequest) {
    const token = process.env.AGENDA_API_TOKEN;
    if (token && request.nextUrl.pathname !== '/api/health' && request.method !== 'OPTIONS'
        && request.headers.get('X-Agenda-Token') !== token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }
    return NextResponse.next();
}
export const config = { matcher: '/api/:path*' };
