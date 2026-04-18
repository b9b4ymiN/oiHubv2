import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ErrorResponse {
  error: string
}

// GET /api/paper-trading/[id] — get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getSessionById } = await import('@/lib/paper-trading/engine')
    const session = getSessionById(id)

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get session',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 500 }
    )
  }
}

// DELETE /api/paper-trading/[id] — delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { deleteSession } = await import('@/lib/paper-trading/engine')

    deleteSession(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    const statusCode =
      error instanceof Error && error.message.includes('not found')
        ? 404
        : error instanceof Error && error.message.includes('running')
        ? 400
        : 500

    return NextResponse.json(
      {
        error: 'Failed to delete session',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: statusCode }
    )
  }
}
