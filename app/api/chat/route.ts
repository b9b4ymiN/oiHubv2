import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const API_URL = process.env.CHAT_API_URL || "http://bf-gai.duckdns.org/chat";

// Format chart context into a readable message for the AI
function formatChartContext(context: any, language: string = "thai"): string {
  const { type, data, metadata } = context;

  let contextText = `\n\n📊 **Chart Context Available:**\n`;
  contextText += `Type: ${type}\n`;

  if (metadata?.symbol) contextText += `Symbol: ${metadata.symbol}\n`;
  if (metadata?.interval) contextText += `Timeframe: ${metadata.interval}\n`;
  if (metadata?.chartTitle) contextText += `Chart: ${metadata.chartTitle}\n`;

  contextText += `\n**Data Summary:**\n`;

  if (type === "price-oi" && data.summary) {
    const { summary, statistics } = data;
    contextText += `- Current Price: $${summary.currentPrice?.toLocaleString()}\n`;
    contextText += `- Current Open Interest: ${summary.currentOI?.toLocaleString()}\n`;
    contextText += `- Price Change: ${summary.priceChange24h?.toFixed(2)}%\n`;
    contextText += `- OI Change: ${summary.oiChange24h?.toFixed(2)}%\n`;
    contextText += `- 24h Volume: ${summary.volume24h?.toLocaleString()}\n`;

    if (statistics) {
      contextText += `\n**Statistics:**\n`;
      contextText += `- High: $${statistics.highPrice?.toLocaleString()}\n`;
      contextText += `- Low: $${statistics.lowPrice?.toLocaleString()}\n`;
      contextText += `- Avg Volume: ${statistics.avgVolume?.toLocaleString()}\n`;
      contextText += `- OI Trend: ${statistics.oiTrend}\n`;
      contextText += `- Price Trend: ${statistics.priceTrend}\n`;
    }
  } else if (type === "options-iv" && data.summary) {
    contextText += `- ATM IV: ${(data.summary.atmIV * 100)?.toFixed(2)}%\n`;
    contextText += `- Call/Put Ratio: ${data.summary.callPutRatio?.toFixed(
      2
    )}\n`;
    contextText += `- Max Pain: $${data.summary.maxPain?.toLocaleString()}\n`;
  } else if (type === "volume-profile" && data.summary) {
    contextText += `- POC (Point of Control): $${data.summary.poc?.toLocaleString()}\n`;
    contextText += `- Value Area High: $${data.summary.valueAreaHigh?.toLocaleString()}\n`;
    contextText += `- Value Area Low: $${data.summary.valueAreaLow?.toLocaleString()}\n`;
  } else if (data.marketData) {
    // Comprehensive market data from intelligence page
    const { oi, price, funding, longShortRatio, oiMomentum } = data.marketData;

    if (price) {
      contextText += `\n**💰 Price Data:**\n`;
      contextText += `- Current Price: $${Number(
        price.currentPrice
      ).toLocaleString()}\n`;
      contextText += `- Price Change: ${price.priceChange}%\n`;
      contextText += `- 24h High: $${Number(price.high).toLocaleString()}\n`;
      contextText += `- 24h Low: $${Number(price.low).toLocaleString()}\n`;
      contextText += `- Volume: ${Number(price.volume).toLocaleString()}\n`;
    }

    if (oi) {
      contextText += `\n**📊 Open Interest (OI) Data:**\n`;
      contextText += `- Current OI: ${Number(oi.currentOI).toLocaleString()}\n`;
      contextText += `- OI Change: ${oi.oiChange}%\n`;
    }

    if (oiMomentum) {
      contextText += `\n**⚡ OI Momentum & Acceleration:**\n`;
      contextText += `- Momentum: ${oiMomentum.momentum}\n`;
      contextText += `- Acceleration: ${oiMomentum.acceleration}\n`;
      contextText += `- Signal: ${oiMomentum.signal || "NEUTRAL"}\n`;
    }

    if (funding) {
      contextText += `\n**💸 Funding Rate:**\n`;
      contextText += `- Current Rate: ${funding.fundingRate}%\n`;
      contextText += `- Next Funding: ${new Date(
        funding.fundingTime
      ).toLocaleString()}\n`;
    }

    if (longShortRatio) {
      contextText += `\n**⚖️ Long/Short Ratio:**\n`;
      contextText += `- Ratio: ${longShortRatio.longShortRatio}\n`;
      contextText += `- Long Account %: ${longShortRatio.longAccount}%\n`;
      contextText += `- Short Account %: ${longShortRatio.shortAccount}%\n`;
    }
  } else {
    // Generic data display
    contextText += JSON.stringify(data, null, 2).substring(0, 500) + "...\n";
  }

  contextText += `\n**Instructions:** Please analyze this market data comprehensively. Use the 5-Pillar OI Trading Framework:\n`;
  contextText += `1. Options Flow & IV (Smart Money Bias)\n`;
  contextText += `2. Volume Profile (Market Structure)\n`;
  contextText += `3. Buy/Sell Zones (Setup Quality)\n`;
  contextText += `4. Taker Flow (Entry Timing)\n`;
  contextText += `5. OI Divergence (Trend Health)\n`;
  contextText += `\nProvide specific entry, target, stop-loss levels with confidence scores.\n`;

  // Add language-specific instructions
  if (language === "thai") {
    contextText += `**Language Requirement:** กรุณาตอบคำถามทั้งหมดเป็นภาษาไทย ให้คำตอบที่เป็นประโยช์์ เข้าใจ และเหมาะสำหรับผู้เทรดในประเทศไทย\n`;
  }

  return contextText;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract messages, user_id, session_id, language from request
    const { messages, user_id, session_id, language = "thai" } = body;

    // Process messages to move chart_context into content
    const processedMessages = messages.map((msg: any) => {
      // Check if this message has chart_context
      if (msg.chart_context && msg.role === "user") {
        // Format chart context as text
        const contextText = formatChartContext(msg.chart_context, language);

        // Prepend context to user's message content
        const enhancedContent = `${contextText}\n\n---\n\nUser Question: ${msg.content}`;
/*
        console.log(
          "[Chat API] Enhanced message with chart context:",
          msg.chart_context.type
        );

        console.log(
          "[Chat API] Example context message:\n" +
            "=".repeat(80) +
            "\n" +
            contextText +
            "\n" +
            "=".repeat(80)
        );
*/
        return {
          role: msg.role,
          content: enhancedContent,
        };
      }

      // Return message as-is (without chart_context field)
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    // Build request body for external API
    const requestBody: any = {
      persona: "oi-trader",
      messages: processedMessages,
      user_id: user_id || "anonymous",
    };

    // Include session_id if provided (for memory continuation)
    if (session_id) {
      requestBody.session_id = session_id;
    }

    // Call the external API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      new Error(`API responded with status: ${response.status} (${API_URL})`);
    }

    const data = await response.json();

    // Log the raw response for debugging
    console.log(
      "[Chat API] Raw API response:",
      JSON.stringify(data).substring(0, 500)
    );
    console.log(
      "[Chat API] Response type:",
      typeof data,
      "Has answer:",
      !!data.answer
    );

    // Parse the response content properly
    let content = "";

    // First, check if data itself has the structure {thought, action, answer}
    // This is the ReAct agent format
    if (
      data.thought &&
      data.action &&
      data.answer &&
      typeof data === "object"
    ) {
      console.log(
        "[Chat API] Detected ReAct agent format with thought/action/answer"
      );
      content = data.answer;
      console.log("[Chat API] Extracted answer from ReAct format");
    }
    // Check if data.answer is a string
    else if (typeof data.answer === "string") {
      // If it's a string, check if it's JSON
      try {
        const parsed = JSON.parse(data.answer);
        console.log("[Chat API] Parsed answer as JSON:", Object.keys(parsed));

        // If it's a structured response with 'answer' field, extract it
        if (parsed.answer) {
          content = parsed.answer;
          console.log(
            "[Chat API] Extracted nested answer field from JSON string"
          );
        } else if (parsed.thought && parsed.action && parsed.answer) {
          // ReAct format inside JSON string
          content = parsed.answer;
          console.log(
            "[Chat API] Extracted answer from ReAct format in JSON string"
          );
        } else {
          // Use the string as-is (it's already the answer)
          content = data.answer;
          console.log("[Chat API] Using answer string directly");
        }
      } catch (e) {
        // Not JSON, use as-is
        content = data.answer;
        console.log("[Chat API] Answer is not JSON, using as-is");
      }
    }
    // Check if data.answer is an object
    else if (typeof data.answer === "object" && data.answer !== null) {
      console.log(
        "[Chat API] Answer is object with keys:",
        Object.keys(data.answer)
      );

      // If it's already an object with 'answer' field
      if (data.answer.answer) {
        content = data.answer.answer;
        console.log("[Chat API] Extracted answer from nested object");
      } else {
        // Fallback: stringify the object
        content = JSON.stringify(data.answer, null, 2);
        console.log("[Chat API] Stringified answer object");
      }
    } else {
      console.error(
        "[Chat API] Unexpected answer type:",
        typeof data.answer,
        "Full data keys:",
        Object.keys(data)
      );
      content = "Unable to parse AI response. Please try again.";
    }

    // Convert escaped newlines to actual newlines for proper markdown rendering
    // This handles cases where the API returns strings like "line1\nline2" instead of actual line breaks
    if (content.includes("\\n")) {
      console.log("[Chat API] Converting escaped newlines to actual newlines");
      content = content.replace(/\\n/g, "\n");
    }

    // Also handle other escaped characters
    if (content.includes('\\"')) {
      content = content.replace(/\\"/g, '"');
    }
    if (content.includes("\\t")) {
      content = content.replace(/\\t/g, "\t");
    }

    console.log("[Chat API] Final content length:", content.length);
    console.log("[Chat API] Content preview:", content.substring(0, 200));

    // Return the answer along with session_id for memory persistence
    return new NextResponse(
      JSON.stringify({
        role: "assistant",
        content: content,
        events: data.events,
        session_id: data.session_id,
        context_used: data.context_used,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
