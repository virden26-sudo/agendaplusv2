import { NextRequest, NextResponse } from 'next/server';
import { parsePortalData } from '@/ai/flows/portal-parser';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  console.log('API: /api/parse-portal/ POST request received');
  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return withCors(NextResponse.json({ error: "Empty request body" }, { status: 400 }));
    }
    const body = JSON.parse(text);
    const result = await parsePortalData(body);
    return withCors(NextResponse.json(result));
  } catch (error: unknown) {
    console.error('Portal parsing error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }

    const message = error instanceof Error ? error.message : 'Failed to parse portal data';
    const isSessionError = message.includes("expired") || message.includes("login") || message.includes("auth");
    const status = isSessionError ? 401 : 500;
    return withCors(NextResponse.json(
      { error: message },
      { status }
    ));
  }
}