import { NextRequest, NextResponse } from 'next/server';
import { parseSyllabusText } from '@/ai/flows/syllabus-text-parser';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseSyllabusText(body);
    return withCors(NextResponse.json(result));
  } catch (error) {
    console.error('Syllabus text parsing error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to parse syllabus text' },
      { status: 500 }
    ));
  }
}