import { NextRequest, NextResponse } from 'next/server';
import { parseSyllabus } from '@/ai/flows/syllabus-parser';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseSyllabus(body);
    return withCors(NextResponse.json(result));
  } catch (error) {
    console.error('Syllabus parsing error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to parse syllabus' },
      { status: 500 }
    ));
  }
}