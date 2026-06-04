import { NextRequest, NextResponse } from 'next/server';
import { scrapePortal } from '@/lib/scraper';
import { corsOptions, withCors } from '@/lib/cors';

export const OPTIONS = corsOptions;

export async function POST(request: NextRequest) {
  console.log('API: /api/scrape POST request received');
  try {
    const body = await request.json();
    const { url, user, pass } = body;

    if (!url) {
      return withCors(NextResponse.json({ error: 'URL is required' }, { status: 400 }));
    }

    const content = await scrapePortal(url, user, pass);
    return withCors(NextResponse.json({ content }));
  } catch (error: unknown) {
    console.error('Scraping error:', error);
    const message = error instanceof Error ? error.message : 'Failed to scrape portal';
    return withCors(NextResponse.json(
      { error: message },
      { status: 500 }
    ));
  }
}
