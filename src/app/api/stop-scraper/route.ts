import { NextResponse } from 'next/server';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST() {
  console.log('API: /api/stop-scraper/ POST request received');
  try {
    const { closeSharedBrowser } = await import('@/lib/scraper');
    await closeSharedBrowser();
    return withCors(NextResponse.json({ success: true }));
  } catch (error: unknown) {
    console.error('Stop scraper error:', error);
    return withCors(NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop scraper' },
      { status: 500 }
    ));
  }
}
