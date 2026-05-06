import {NextRequest, NextResponse} from 'next/server';
import {parsePortalData} from '@/ai/flows/portal-parser';

export async function POST(request: NextRequest) {
    console.log('API: /api/parse-portal/ POST request received');
    try {
        const body = await request.json();
        const result = await parsePortalData(body);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Portal parsing error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json(
            {error: 'Failed to parse portal data'},
            {status: 500}
        );
    }
}