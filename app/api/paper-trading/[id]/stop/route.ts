import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/paper-trading/[id]/stop — stop a running session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { stopSession } = await import('@/lib/paper-trading/engine')

    const session = stopSession(id)

    return NextResponse.json({ session })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found')
        ? 404
        : error instanceof Error && error.message.includes('not running')
        ? 400
        : 500

    return NextResponse.json(
      {
        error: 'Failed to stop session',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: statusCode }
    )
  }
}
