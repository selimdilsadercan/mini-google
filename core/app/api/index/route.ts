import { NextResponse } from 'next/server';
import { manager } from '@/lib/crawler';

export async function POST(request: Request) {
  try {
    const { origin, k } = await request.json();

    if (!origin || k === undefined) {
      return NextResponse.json({ error: 'Origin and k (depth) are required' }, { status: 400 });
    }

    // Start indexing in the background
    // Map 'k' to 'depth' and use default hitRate
    const id = manager.create(origin, k, 10); 

    return NextResponse.json({ 
      message: 'Indexing started successfully',
      crawler_id: id
    });
  } catch (error) {
    console.error("Index API Error:", error);
    return NextResponse.json({ error: 'Failed to start indexing' }, { status: 500 });
  }
}
