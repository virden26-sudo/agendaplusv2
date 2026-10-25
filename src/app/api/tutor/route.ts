import {NextRequest, NextResponse} from 'next/server';
import {TutorInputSchema} from '@/ai/schemas';
import {getTutorResponse} from '@/ai/flows/tutor-flow';
import {corsOptions, withCors} from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = TutorInputSchema.safeParse(body);
        if (!parsed.success) return withCors(NextResponse.json({error:'Invalid tutor context or question'}, {status:400}));
        const result = await getTutorResponse(parsed.data);
        return withCors(NextResponse.json(result));
    } catch (error) {
        console.error('Tutor response error:', error);
        return withCors(NextResponse.json(
            {error: 'Failed to generate tutor response'},
            {status: 500}
        ));
    }
}
