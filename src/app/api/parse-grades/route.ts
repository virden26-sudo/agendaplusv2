import { NextRequest, NextResponse } from 'next/server';
import { parseGrades } from '@/ai/flows/grade-parser';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseGrades(body);
    return withCors(NextResponse.json(result));
  } catch (error) {
    console.error('Grades parsing error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to parse grades data' },
      { status: 500 }
    ));
  }
}
