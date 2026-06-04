import {NextRequest, NextResponse} from 'next/server';
import {getTutorResponse} from '@/ai/flows/tutor-flow';
import {corsOptions, withCors} from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await getTutorResponse(body);
        return withCors(NextResponse.json(result));
    } catch (error) {
        console.error('Tutor response error:', error);
        return withCors(NextResponse.json(
            {error: 'Failed to generate tutor response'},
            {status: 500}
        ));
    }
}
