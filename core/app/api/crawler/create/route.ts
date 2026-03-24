import { NextResponse } from 'next/server';
import { manager } from '@/lib/crawler';

export async function POST(request: Request) {
  try {
    const { origin, depth, hitRate, onlyExternalDomains } = await request.json();

    if (!origin || depth === undefined) {
      return NextResponse.json({ error: 'Origin and depth are required' }, { status: 400 });
    }

    const id = manager.create(origin, depth, hitRate || 5, onlyExternalDomains || false);

    return NextResponse.json({ 
      message: 'Robot deployed successfully', 
      crawler_id: id 
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to deploy robot' }, { status: 500 });
  }
}
