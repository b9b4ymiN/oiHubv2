'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useOITraderChat } from '@/lib/hooks/useOITraderChat'
import ReactMarkdown from 'react-markdown'

export function ChatModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage } = useOITraderChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    await sendMessage(message)
  }

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] hover:scale-110 z-50 group transition-all duration-300 border-2 border-white/20"
        size="icon"
      >
        <MessageSquare className="h-7 w-7 group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse shadow-lg border-2 border-white"></span>
      </Button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl h-[600px] flex flex-col shadow-2xl border-2 border-purple-500/30 animate-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white rounded-t-lg shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30 shadow-xl">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">OI Trader Assistant</h3>
                  <p className="text-xs text-cyan-100">
                    Powered by AI • Ask anything about OI Trading
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                  <h4 className="font-semibold text-lg mb-2">Welcome to OI Trader Assistant!</h4>
                  <p className="text-sm">
                    Ask me anything about Open Interest trading, market analysis, or how to use this
                    platform.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage('What is OI trading?')}
                      className="text-xs border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      What is OI trading?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage('How to read the heatmap?')}
                      className="text-xs border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      How to read the heatmap?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage('Explain volume profile')}
                      className="text-xs border-cyan-500 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      Explain volume profile
                    </Button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-md">
                    <div className="flex gap-2">
                      <div className="h-2 w-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full animate-bounce"></div>
                      <div
                        className="h-2 w-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="h-2 w-2 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t bg-white dark:bg-gray-950 rounded-b-lg"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about OI trading, strategies, or analysis..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Powered by OI Trader AI • Real-time trading analysis
              </p>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
