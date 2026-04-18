import { NextRequest, NextResponse } from 'next/server';
import { getRule, setRule, deleteRule } from '@/lib/alerts/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rule = getRule(id);
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }
  return NextResponse.json({ rule });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = getRule(id);
  if (!existing) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const updated = {
      ...existing,
      ...body,
      id: existing.id, // prevent ID change
      createdAt: existing.createdAt, // prevent creation time change
      updatedAt: Date.now(),
    };
    setRule(id, updated);
    return NextResponse.json({ rule: updated });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteRule(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
