import { NextRequest, NextResponse } from 'next/server';
import { parseAssignment } from '@/ai/flows/natural-language-assignment-input';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseAssignment(body);
    return withCors(NextResponse.json(result));
  } catch (error) {
    console.error('Assignment parsing error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to parse assignment' },
      { status: 500 }
    ));
  }
}
