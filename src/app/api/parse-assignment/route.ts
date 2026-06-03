import { NextRequest, NextResponse } from 'next/server';
import { parseAssignment } from '@/ai/flows/natural-language-assignment-input';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await parseAssignment(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Assignment parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse assignment' },
      { status: 500 }
    );
  }
}
