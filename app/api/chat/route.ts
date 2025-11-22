import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const API_URL = process.env.CHAT_API_URL || 'http://bf-gai.duckdns.org/chat'

// Format chart context into a readable message for the AI
function formatChartContext(context: any): string {
  const { type, data, metadata } = context

  let contextText = `\n\n📊 **Chart Context Available:**\n`
  contextText += `Type: ${type}\n`

  if (metadata?.symbol) contextText += `Symbol: ${metadata.symbol}\n`
  if (metadata?.interval) contextText += `Timeframe: ${metadata.interval}\n`
  if (metadata?.chartTitle) contextText += `Chart: ${metadata.chartTitle}\n`

  contextText += `\n**Data Summary:**\n`

  if (type === 'price-oi' && data.summary) {
    const { summary, statistics } = data
    contextText += `- Current Price: $${summary.currentPrice?.toLocaleString()}\n`
    contextText += `- Current Open Interest: ${summary.currentOI?.toLocaleString()}\n`
    contextText += `- Price Change: ${summary.priceChange24h?.toFixed(2)}%\n`
    contextText += `- OI Change: ${summary.oiChange24h?.toFixed(2)}%\n`
    contextText += `- 24h Volume: ${summary.volume24h?.toLocaleString()}\n`

    if (statistics) {
      contextText += `\n**Statistics:**\n`
      contextText += `- High: $${statistics.highPrice?.toLocaleString()}\n`
      contextText += `- Low: $${statistics.lowPrice?.toLocaleString()}\n`
      contextText += `- Avg Volume: ${statistics.avgVolume?.toLocaleString()}\n`
      contextText += `- OI Trend: ${statistics.oiTrend}\n`
      contextText += `- Price Trend: ${statistics.priceTrend}\n`
    }
  } else if (type === 'options-iv' && data.summary) {
    contextText += `- ATM IV: ${(data.summary.atmIV * 100)?.toFixed(2)}%\n`
    contextText += `- Call/Put Ratio: ${data.summary.callPutRatio?.toFixed(2)}\n`
    contextText += `- Max Pain: $${data.summary.maxPain?.toLocaleString()}\n`
  } else if (type === 'volume-profile' && data.summary) {
    contextText += `- POC (Point of Control): $${data.summary.poc?.toLocaleString()}\n`
    contextText += `- Value Area High: $${data.summary.valueAreaHigh?.toLocaleString()}\n`
    contextText += `- Value Area Low: $${data.summary.valueAreaLow?.toLocaleString()}\n`
  } else {
    // Generic data display
    contextText += JSON.stringify(data, null, 2).substring(0, 500) + '...\n'
  }

  contextText += `\n**Instructions:** Please analyze this chart data in your response. Provide insights based on the data shown above.\n`

  return contextText
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract messages, user_id, session_id from request
    const { messages, user_id, session_id } = body

    // Check if the last message has chart_context
    const lastMessage = messages[messages.length - 1]
    const chart_context = lastMessage?.chart_context

    // Build request body for external API
    const requestBody: any = {
      messages: messages,
      user_id: user_id || 'anonymous',
    }

    // Include session_id if provided (for memory continuation)
    if (session_id) {
      requestBody.session_id = session_id
    }

    // Include chart context if provided in message
    if (chart_context) {
      // Format chart context for the AI
      const contextMessage = formatChartContext(chart_context)

      // Add context as a system message or prepend to user message
      requestBody.chart_context = contextMessage

      console.log('[Chat API] Including chart context from message:', chart_context.type)
    }
    
    // Call the external API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Return the answer along with session_id for memory persistence
    return new NextResponse(
      JSON.stringify({
        role: 'assistant',
        content: data.answer,
        events: data.events,
        session_id: data.session_id,
        context_used: data.context_used,
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
