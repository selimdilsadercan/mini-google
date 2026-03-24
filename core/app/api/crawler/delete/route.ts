import { NextResponse } from 'next/server';
import { manager } from '@/lib/crawler';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    manager.deleteJob(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete crawler' }, { status: 500 });
  }
}
