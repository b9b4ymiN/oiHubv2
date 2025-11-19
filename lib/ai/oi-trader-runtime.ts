import { ChatModelAdapter, LanguageModelV1CallOptions, LanguageModelV1StreamPart } from "@assistant-ui/react";

const API_URL = "http://bf-gai.duckdns.org/chat";

interface OITraderMessage {
  role: "user" | "assistant";
  content: string;
}

interface OITraderRequest {
  persona: "oi-trader";
  messages: OITraderMessage[];
}

interface OITraderResponse {
  answer: string;
  events: Array<{
    step: number;
    agent: string;
    action: string;
    tool: string | null;
    target_agent: string | null;
    thought: string;
  }>;
}

/**
 * Custom ChatModelAdapter for OI Trader API
 * Connects to bf-gai.duckdns.org API with persona="oi-trader"
 */
export class OITraderAdapter implements ChatModelAdapter {
  async run({ messages, abortSignal }: LanguageModelV1CallOptions): Promise<AsyncGenerator<LanguageModelV1StreamPart>> {
    // Convert assistant-ui messages to OI Trader format
    const oiTraderMessages: OITraderMessage[] = messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: typeof msg.content === "string"
        ? msg.content
        : msg.content.map(c => c.type === "text" ? c.text : "").join(""),
    }));

    const requestBody: OITraderRequest = {
      persona: "oi-trader",
      messages: oiTraderMessages,
    };

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`OI Trader API error: ${response.status} ${response.statusText}`);
      }

      const data: OITraderResponse = await response.json();

      // Convert response to assistant-ui stream format
      return this.createStreamGenerator(data);
    } catch (error) {
      console.error("OI Trader API Error:", error);
      throw error;
    }
  }

  /**
   * Convert OI Trader response to assistant-ui stream format
   */
  private async *createStreamGenerator(data: OITraderResponse): AsyncGenerator<LanguageModelV1StreamPart> {
    // Stream the thinking/reasoning events as steps
    for (const event of data.events) {
      if (event.thought) {
        yield {
          type: "step",
          text: `🤔 ${event.agent}: ${event.thought}`,
        } as any;
      }
    }

    // Stream the answer as text deltas (word by word for smoother UX)
    const words = data.answer.split(" ");
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      yield {
        type: "text-delta",
        textDelta: i === 0 ? word : ` ${word}`,
      };

      // Small delay for streaming effect
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    // Finish the stream
    yield {
      type: "finish",
      finishReason: "stop",
      usage: {
        promptTokens: 0,
        completionTokens: 0,
      },
    };
  }
}

/**
 * Create an OI Trader runtime
 * Usage:
 * ```tsx
 * import { createOITraderRuntime } from "@/lib/ai/oi-trader-runtime";
 *
 * const runtime = createOITraderRuntime();
 *
 * <AssistantRuntimeProvider runtime={runtime}>
 *   <Thread />
 * </AssistantRuntimeProvider>
 * ```
 */
export function createOITraderRuntime() {
  return {
    adapter: new OITraderAdapter(),
  };
}
