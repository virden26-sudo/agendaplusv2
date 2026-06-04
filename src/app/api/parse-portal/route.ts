import { NextRequest, NextResponse } from 'next/server';
import { parsePortalData } from '@/ai/flows/portal-parser';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  console.log('API: /api/parse-portal/ POST request received');
  try {
    const body = await request.json();
    const result = await parsePortalData(body);
    return withCors(NextResponse.json(result));
  } catch (error: unknown) {
    console.error('Portal parsing error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }

    const message = error instanceof Error ? error.message : 'Failed to parse portal data';
    return withCors(NextResponse.json(
      { error: message },
      { status: 500 }
    ));
  }
}