import {NextRequest, NextResponse} from 'next/server';
import {parseSyllabus} from '@/ai/flows/syllabus-parser';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = await parseSyllabus(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Syllabus parsing error:', error);
        return NextResponse.json(
            {error: 'Failed to parse syllabus'},
            {status: 500}
        );
    }
}