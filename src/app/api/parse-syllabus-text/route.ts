import { NextRequest, NextResponse } from 'next/server';
import { parseSyllabusText } from '@/ai/flows/syllabus-text-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseSyllabusText(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Syllabus text parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse syllabus text' },
      { status: 500 }
    );
  }
}