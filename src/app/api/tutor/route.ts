import {NextRequest, NextResponse} from 'next/server';
import {getTutorResponse} from '@/ai/flows/tutor-flow';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await getTutorResponse(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Tutor response error:', error);
        return NextResponse.json(
            {error: 'Failed to generate tutor response'},
            {status: 500}
        );
    }
}
