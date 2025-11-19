"use client";

import { useState } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  Thread,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
} from "@assistant-ui/react";
import { X, Bot, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface OITraderChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * OI Trader AI Chat Modal
 * Floating chat interface that connects to bf-gai.duckdns.org API
 */
export function OITraderChatModal({ isOpen, onClose }: OITraderChatModalProps) {
  // Create runtime with custom adapter
  const runtime = useLocalRuntime({
    adapters: {
      chatModel: async ({ messages, abortSignal }) => {
        // Convert to OI Trader API format
        const oiTraderMessages = messages.map((msg) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content:
            typeof msg.content === "string"
              ? msg.content
              : msg.content.map((c) => (c.type === "text" ? c.text : "")).join(""),
        }));

        try {
          const response = await fetch("http://bf-gai.duckdns.org/chat", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              persona: "oi-trader",
              messages: oiTraderMessages,
            }),
            signal: abortSignal,
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }

          const data = await response.json();

          // Return as stream generator
          return {
            stream: (async function* () {
              // Yield thinking events
              for (const event of data.events || []) {
                if (event.thought) {
                  yield {
                    type: "text-delta" as const,
                    textDelta: `💭 ${event.agent}: ${event.thought}\n\n`,
                  };
                }
              }

              // Yield the answer
              const words = data.answer.split(" ");
              for (let i = 0; i < words.length; i++) {
                yield {
                  type: "text-delta" as const,
                  textDelta: i === 0 ? words[i] : ` ${words[i]}`,
                };
                await new Promise((resolve) => setTimeout(resolve, 20));
              }

              yield {
                type: "finish" as const,
                finishReason: "stop" as const,
              };
            })(),
          };
        } catch (error) {
          console.error("OI Trader API Error:", error);
          throw error;
        }
      },
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md h-[600px] bg-blur-bg-secondary border-2 border-blur-orange/30 rounded-lg shadow-blur-glow flex flex-col overflow-hidden backdrop-blur-blur">
        <AssistantRuntimeProvider runtime={runtime}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-blur-orange/20 bg-blur-orange/10">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blur-orange" />
              <h3 className="font-bold text-blur-text-primary uppercase tracking-wide">
                OI Trader AI Assistant
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-blur-orange/20 rounded transition-colors"
            >
              <X className="w-5 h-5 text-blur-text-secondary" />
            </button>
          </div>

          {/* Chat Thread */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <ThreadPrimitive.Root>
              <ThreadPrimitive.Viewport className="space-y-4">
                <ThreadPrimitive.Messages
                  components={{
                    UserMessage: UserMessage,
                    AssistantMessage: AssistantMessage,
                  }}
                />
              </ThreadPrimitive.Viewport>
            </ThreadPrimitive.Root>
          </div>

          {/* Composer */}
          <div className="p-4 border-t border-blur-orange/20 bg-blur-bg-primary">
            <ComposerPrimitive.Root>
              <div className="flex items-end gap-2">
                <ComposerPrimitive.Input
                  placeholder="ถามเกี่ยวกับการเทรด OI, Options, หรือ Futures..."
                  className="flex-1 min-h-[40px] max-h-[120px] px-3 py-2 bg-blur-bg-tertiary border border-blur-orange/20 rounded-lg text-blur-text-primary placeholder:text-blur-text-muted focus:outline-none focus:ring-2 focus:ring-blur-orange/50 resize-none"
                  rows={1}
                />
                <ComposerPrimitive.Send asChild>
                  <button className="p-2 bg-blur-orange hover:bg-blur-orange-bright text-blur-bg-primary rounded-lg transition-colors shadow-blur-glow">
                    <Send className="w-5 h-5" />
                  </button>
                </ComposerPrimitive.Send>
              </div>
            </ComposerPrimitive.Root>
          </div>
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}

// User Message Component
function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="max-w-[80%] bg-blur-orange/20 border border-blur-orange/30 rounded-lg p-3">
        <MessagePrimitive.Content className="text-blur-text-primary text-sm whitespace-pre-wrap" />
      </div>
    </MessagePrimitive.Root>
  );
}

// Assistant Message Component
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start">
      <div className="max-w-[80%] bg-blur-bg-tertiary border border-white/8 rounded-lg p-3">
        <div className="flex items-start gap-2 mb-2">
          <Bot className="w-4 h-4 text-blur-orange mt-0.5 flex-shrink-0" />
          <span className="text-xs font-bold text-blur-orange uppercase">OI Trader AI</span>
        </div>
        <MessagePrimitive.Content
          className="text-blur-text-primary text-sm whitespace-pre-wrap prose prose-invert prose-sm max-w-none
          prose-headings:text-blur-text-primary prose-headings:font-bold
          prose-p:text-blur-text-primary prose-p:leading-relaxed
          prose-strong:text-blur-orange prose-strong:font-bold
          prose-code:text-blur-orange prose-code:bg-blur-bg-primary prose-code:px-1 prose-code:rounded
          prose-pre:bg-blur-bg-primary prose-pre:border prose-pre:border-white/8
          prose-ul:text-blur-text-primary prose-ol:text-blur-text-primary
          prose-li:text-blur-text-primary"
        />
      </div>
    </MessagePrimitive.Root>
  );
}

/**
 * Floating Chat Button
 * Opens the OI Trader AI Chat Modal
 */
export function OITraderChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-blur-orange hover:bg-blur-orange-bright text-blur-bg-primary rounded-full shadow-blur-glow transition-all duration-200 hover:scale-110 group"
        aria-label="Open AI Assistant"
      >
        <Bot className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </button>

      <OITraderChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
