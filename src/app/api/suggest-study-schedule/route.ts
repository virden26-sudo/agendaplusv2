import { NextRequest, NextResponse } from 'next/server';
import { suggestStudySchedule } from '@/ai/flows/intelligent-study-schedule-suggestions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await suggestStudySchedule(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Study schedule suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate study schedule' },
      { status: 500 }
    );
  }
}
