import { NextResponse } from 'next/server';
import { manager } from '@/lib/crawler';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crawlerId = searchParams.get('id');

  if (!crawlerId) {
    return NextResponse.json({ error: 'Crawler ID is required' }, { status: 400 });
  }

  const logs = manager.getLogs(crawlerId);
  return NextResponse.json(logs);
}
