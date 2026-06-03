import {NextRequest, NextResponse} from 'next/server';
import {extractPortalData} from '@/ai/flows/extract-items-flow';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await extractPortalData(body.text || '');
        return NextResponse.json(result);
    } catch (error) {
        console.error('Item extraction error:', error);
        return NextResponse.json(
            {error: 'Failed to extract academic items'},
            {status: 500}
        );
    }
}
