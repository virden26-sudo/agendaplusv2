import {NextRequest, NextResponse} from 'next/server';
import {extractPortalData} from '@/ai/flows/extract-items-flow';
import {corsOptions, withCors} from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await extractPortalData(body.text || '');
        return withCors(NextResponse.json(result));
    } catch (error) {
        console.error('Item extraction error:', error);
        return withCors(NextResponse.json(
            {error: 'Failed to extract academic items'},
            {status: 500}
        ));
    }
}
