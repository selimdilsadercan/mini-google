import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db';

export async function GET() {
  try {
    const domainDistribution = dbService.getDomainDistribution();
    const indexingHistory = dbService.getHistory();
    const stats = dbService.getStats();

    return NextResponse.json({
      domainDistribution,
      indexingHistory,
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
