import { NextResponse } from 'next/server';
import { manager } from '@/lib/crawler';

export async function GET() {
  const jobStatuses = manager.getAllJobStatuses();
  return NextResponse.json(jobStatuses);
}
