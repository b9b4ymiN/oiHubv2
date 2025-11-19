import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const API_URL = process.env.CHAT_API_URL || 'http://bf-gai.duckdns.org/chat'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Extract messages from request
    const { messages } = body
    
    // Call the external API with persona='oi-trader'
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        persona: 'oi-trader',
        messages: messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Return the answer as a streaming response compatible with assistant-ui
    return new NextResponse(
      JSON.stringify({
        role: 'assistant',
        content: data.answer,
        events: data.events,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
