import { NextRequest, NextResponse } from 'next/server';
import { generatePlacementTest } from '@/ai/flows/tutor-test-flow';
import { generateLearningStrategies } from '@/ai/flows/tutor-analysis-flow';

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action, data } = body;

    try {
        if (action === 'generateTest') {
            const result = await generatePlacementTest(data.courseName);
            return NextResponse.json(result);
        } else if (action === 'analyzeTest') {
            const result = await generateLearningStrategies(data.testResults);
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
