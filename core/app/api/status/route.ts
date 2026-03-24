import { NextResponse } from 'next/server';
import { manager } from '@/lib/crawler';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crawlerId = searchParams.get('id');

  if (crawlerId) {
    const stats = manager.getStats(crawlerId);
    return NextResponse.json(stats);
  }

  // Global system overview
  const jobStatuses = manager.getAllJobStatuses();
  const activeCount = jobStatuses.filter((j: any) => j.status === 'running').length;
  
  return NextResponse.json({
    totalJobs: jobStatuses.length,
    activeJobs: activeCount
  });
}
