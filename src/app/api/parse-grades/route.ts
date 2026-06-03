import { NextRequest, NextResponse } from 'next/server';
import { parseGrades } from '@/ai/flows/grade-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseGrades(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Grades parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse grades data' },
      { status: 500 }
    );
  }
}
