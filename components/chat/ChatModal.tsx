'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageSquare, Sparkles, Copy, Check, Trash2, RotateCcw, Database, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOITraderChat } from '@/lib/hooks/useOITraderChat'
import { useChatContext } from '@/lib/contexts/ChatContextProvider'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

export function ChatModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, isLoading, sendMessage, clearMessages } = useOITraderChat()
  const { context, clearContext, pendingQuestion, setPendingQuestion } = useChatContext()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const [swipeProgress, setSwipeProgress] = useState(0)

  // Detect mobile on client-side only
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle swipe down to close on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return
    setTouchStart(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return
    const currentY = e.targetTouches[0].clientY
    setTouchEnd(currentY)

    // Calculate swipe progress (0-100%)
    const distance = currentY - touchStart
    if (distance > 0) {
      const progress = Math.min((distance / 150) * 100, 100)
      setSwipeProgress(progress)
    }
  }

  const handleTouchEnd = () => {
    if (!isMobile) return
    const swipeDistance = touchEnd - touchStart
    // If swiped down more than 100px, close modal
    if (swipeDistance > 100) {
      setIsOpen(false)
    }
    setTouchStart(0)
    setTouchEnd(0)
    setSwipeProgress(0)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-scroll when textarea is focused on mobile (keyboard appears)
  useEffect(() => {
    if (!isMobile) return

    const handleFocus = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }, 300) // Delay to wait for keyboard animation
    }

    const textarea = textareaRef.current
    textarea?.addEventListener('focus', handleFocus)

    return () => {
      textarea?.removeEventListener('focus', handleFocus)
    }
  }, [isMobile])

  // Prevent body scroll when modal is open (mobile)
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }

    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [isOpen, isMobile])

  // Listen for openChatWithContext event
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true)
    }

    window.addEventListener('openChatWithContext', handleOpenChat)
    return () => window.removeEventListener('openChatWithContext', handleOpenChat)
  }, [])

  // Send pending question when modal opens with context
  useEffect(() => {
    if (isOpen && pendingQuestion && context) {
      const question = pendingQuestion
      setPendingQuestion(null)
      sendMessage(question)
    }
  }, [isOpen, pendingQuestion, context])

  // Auto-focus textarea on desktop when modal opens
  useEffect(() => {
    if (isOpen && !isMobile && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen, isMobile])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    // Allow Shift+Enter for new line (default behavior)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages?')) {
      clearMessages()
      clearContext()
    }
  }

  const getContextSummary = () => {
    if (!context) return null

    const typeLabels: Record<string, string> = {
      'price-oi': 'Price & OI Chart',
      'options-iv': 'Options IV Analysis',
      'volume-profile': 'Volume Profile',
      'taker-flow': 'Taker Flow',
      'oi-divergence': 'OI Divergence',
      'general': 'Chart Data'
    }

    return {
      label: typeLabels[context.type] || 'Chart Data',
      symbol: context.metadata?.symbol,
      interval: context.metadata?.interval,
      title: context.metadata?.chartTitle
    }
  }

  return (
    <>
      {/* Floating Chat Button - Mobile optimized with safe area insets */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 chat-floating-button h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl bg-gradient-to-br from-[var(--blur-orange)] to-[var(--blur-orange-bright)] hover:shadow-[0_0_40px_rgba(255,135,0,0.6)] hover:scale-110 active:scale-95 z-50 group transition-all duration-300 border-2 border-white/20 backdrop-blur-sm touch-manipulation"
        size="icon"
        aria-label="Open AI Chat"
      >
        <MessageSquare className="h-6 w-6 sm:h-7 sm:w-7 text-white group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 bg-[#22c55e] rounded-full animate-pulse shadow-lg border-2 border-white" aria-hidden="true"></span>
        {messages.length > 0 && (
          <span className="absolute -top-2 -left-2 h-5 w-5 sm:h-6 sm:w-6 bg-[var(--blur-orange-bright)] rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white border-2 border-white shadow-lg" aria-label={`${messages.filter(m => m.role === 'assistant').length} messages`}>
            {messages.filter(m => m.role === 'assistant').length}
          </span>
        )}
      </Button>

      {/* Modal - Mobile optimized with dynamic viewport height */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[var(--blur-bg-primary)]/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            // Close modal when clicking backdrop (not on mobile)
            if (e.target === e.currentTarget && !isMobile) {
              setIsOpen(false)
            }
          }}
        >
          <Card className="w-full max-w-3xl h-[100dvh] sm:h-[85vh] sm:max-h-[700px] flex flex-col shadow-2xl border-0 sm:border-2 border-[var(--blur-orange)]/30 animate-in slide-in-from-bottom sm:zoom-in duration-200 bg-[var(--blur-bg-secondary)] sm:rounded-lg overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-modal-title"
          >
            {/* Header - Swipeable on mobile */}
            <div
              className="flex items-center justify-between p-3 sm:p-4 border-b border-[var(--blur-orange)]/30 bg-gradient-to-r from-[var(--blur-orange)] to-[var(--blur-orange-bright)] text-white shadow-lg relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipe indicator for mobile */}
              {isMobile && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/40 rounded-full overflow-hidden" aria-hidden="true">
                  {swipeProgress > 0 && (
                    <div
                      className="h-full bg-white rounded-full transition-all duration-100"
                      style={{ width: `${swipeProgress}%` }}
                    />
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/40 shadow-xl flex-shrink-0">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="chat-modal-title" className="font-bold text-base sm:text-xl truncate">OI Trader AI</h3>
                  <p className="text-[10px] sm:text-xs text-white/90 font-medium truncate">
                    ⚡ {messages.length} messages
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearChat}
                    className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:bg-white/20 active:bg-white/30 transition-all duration-200 touch-manipulation"
                    title="Clear all messages"
                  >
                    <Trash2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-9 w-9 sm:h-10 sm:w-10 text-white hover:bg-white/20 active:bg-white/30 transition-all duration-200 touch-manipulation"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Context Display */}
            {context && (
              <div className="px-3 sm:px-4 py-2 border-b border-[var(--blur-orange)]/30 bg-[var(--blur-orange)]/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--blur-orange)] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] sm:text-xs border-[var(--blur-orange)] text-[var(--blur-orange)]">
                          {getContextSummary()?.label}
                        </Badge>
                        {getContextSummary()?.symbol && (
                          <span className="text-[10px] sm:text-xs text-[var(--blur-text-secondary)] font-mono">
                            {getContextSummary()?.symbol}
                          </span>
                        )}
                        {getContextSummary()?.interval && (
                          <span className="text-[10px] sm:text-xs text-[var(--blur-text-muted)]">
                            {getContextSummary()?.interval}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-[var(--blur-text-muted)] mt-0.5">
                        AI has access to this chart data
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearContext}
                    className="h-7 w-7 sm:h-8 sm:w-8 text-[var(--blur-text-muted)] hover:text-[var(--blur-orange)] hover:bg-[var(--blur-orange)]/10 flex-shrink-0"
                    title="Clear context"
                  >
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Messages - Optimized scrolling for mobile */}
            <div
              className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[var(--blur-bg-primary)] scrollbar-thin scrollbar-thumb-[var(--blur-orange)]/20 scrollbar-track-transparent"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain'
              }}
            >
              {messages.length === 0 && (
                <div className="text-center py-8 sm:py-12 px-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[var(--blur-orange)] to-[var(--blur-orange-bright)] mb-3 sm:mb-4 shadow-xl">
                    <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-white animate-pulse" />
                  </div>
                  <h4 className="font-bold text-xl sm:text-2xl mb-2 sm:mb-3 text-[var(--blur-orange)]" style={{ fontFamily: 'var(--font-proto-mono)' }}>ยินดีต้อนรับ AI ของ OI Trader!</h4>
                  <p className="text-xs sm:text-sm mb-4 sm:mb-6 max-w-md mx-auto text-[var(--blur-text-secondary)]">
                    ถามถามอะไรเกี่ยวกับการเทรด Open Interest การวิเคราะห์ตลาด กลยุทธ์ หรือวิธีการใช้แพลตฟอร์มนี้
                  </p>
                  <div className="flex flex-col gap-2 max-w-md mx-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage('What is OI trading?')}
                      className="text-xs sm:text-sm h-10 sm:h-11 border border-[var(--blur-orange)]/50 bg-[var(--blur-bg-secondary)] text-[var(--blur-orange)] hover:bg-[var(--blur-orange)]/10 hover:border-[var(--blur-orange)] active:scale-95 transition-all duration-300 hover:shadow-lg font-medium touch-manipulation"
                    >
                      💡 What is OI trading?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage('How to read the heatmap?')}
                      className="text-xs sm:text-sm h-10 sm:h-11 border border-[var(--blur-orange)]/50 bg-[var(--blur-bg-secondary)] text-[var(--blur-orange)] hover:bg-[var(--blur-orange)]/10 hover:border-[var(--blur-orange)] active:scale-95 transition-all duration-300 hover:shadow-lg font-medium touch-manipulation"
                    >
                      📊 How to read the heatmap?
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage('Explain volume profile')}
                      className="text-xs sm:text-sm h-10 sm:h-11 border border-[var(--blur-orange)]/50 bg-[var(--blur-bg-secondary)] text-[var(--blur-orange)] hover:bg-[var(--blur-orange)]/10 hover:border-[var(--blur-orange)] active:scale-95 transition-all duration-300 hover:shadow-lg font-medium touch-manipulation"
                    >
                      📈 Explain volume profile
                    </Button>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex group',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[90%] sm:max-w-[85%] rounded-xl p-3 sm:p-4 relative',
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-[var(--blur-orange)] to-[var(--blur-orange-bright)] text-white shadow-lg'
                        : 'glass-card text-[var(--blur-text-primary)]'
                    )}
                  >
                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(message.content, index)}
                      className={cn(
                        'absolute top-2 right-2 p-2 rounded-md transition-all duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch-manipulation',
                        message.role === 'user'
                          ? 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white'
                          : 'bg-[var(--blur-bg-tertiary)] hover:bg-[var(--blur-orange)]/20 active:bg-[var(--blur-orange)]/30 text-[var(--blur-orange)]'
                      )}
                      title="Copy message"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      )}
                    </button>

                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown
                          components={{
                            // Headings
                            h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-bold mb-3 text-blur-orange uppercase tracking-wide">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-lg sm:text-xl font-bold mb-2 mt-4 text-blur-text-primary border-b border-blur-orange/30 pb-2">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-base sm:text-lg font-bold mb-2 mt-3 text-blur-text-primary">{children}</h3>,
                            h4: ({ children }) => <h4 className="text-sm sm:text-base font-bold mb-1 mt-2 text-blur-text-secondary">{children}</h4>,

                            // Paragraphs
                            p: ({ children }) => <p className="text-xs sm:text-sm mb-3 leading-relaxed text-blur-text-primary">{children}</p>,

                            // Lists
                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-xs sm:text-sm text-blur-text-primary">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-xs sm:text-sm text-blur-text-primary">{children}</ol>,
                            li: ({ children }) => <li className="ml-2 text-blur-text-primary">{children}</li>,

                            // Strong/Bold
                            strong: ({ children }) => <strong className="font-bold text-blur-orange">{children}</strong>,

                            // Em/Italic
                            em: ({ children }) => <em className="italic text-blur-text-secondary">{children}</em>,

                            // Blockquote
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-blur-orange pl-3 italic my-3 text-blur-text-secondary">{children}</blockquote>,

                            // Horizontal Rule
                            hr: () => <hr className="border-blur-orange/30 my-4" />,

                            // Code blocks
                            code: ({ node, inline, className, children, ...props }: any) => (
                              inline ? (
                                <code className="bg-blur-orange/10 text-blur-orange px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-bold" {...props}>
                                  {children}
                                </code>
                              ) : (
                                <pre className="bg-blur-bg-primary border border-blur-orange/20 rounded-lg p-2 sm:p-3 my-3 overflow-x-auto">
                                  <code className="text-blur-text-primary text-[10px] sm:text-xs font-mono leading-relaxed" {...props}>
                                    {children}
                                  </code>
                                </pre>
                              )
                            ),

                            // Tables
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3">
                                <table className="min-w-full border border-blur-orange/20 text-xs">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-blur-orange/10">{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr className="border-b border-blur-orange/10">{children}</tr>,
                            th: ({ children }) => <th className="px-3 py-2 text-left font-bold text-blur-orange">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-2 text-blur-text-primary">{children}</td>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass-card p-3 sm:p-4 shadow-lg">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[var(--blur-orange)] rounded-full animate-bounce"></div>
                        <div
                          className="h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[var(--blur-orange-bright)] rounded-full animate-bounce"
                          style={{ animationDelay: '0.15s' }}
                        ></div>
                        <div
                          className="h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[var(--blur-orange)] rounded-full animate-bounce"
                          style={{ animationDelay: '0.3s' }}
                        ></div>
                      </div>
                      <span className="text-[10px] sm:text-xs text-[var(--blur-text-secondary)] font-medium">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-3 sm:p-4 border-t border-[var(--blur-orange)]/30 bg-[var(--blur-bg-secondary)]"
            >
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isMobile ? "ถามเกี่ยวกับการเทรด OI..." : "ถามเกี่ยวกับการเทรด OI... (Shift+Enter สำหรับบรรทัดใหม่)"}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 border border-[var(--blur-orange)]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--blur-orange)] focus:border-transparent bg-[var(--blur-bg-tertiary)] text-[var(--blur-text-primary)] placeholder:text-[var(--blur-text-muted)] resize-none transition-all duration-200 min-h-[44px] sm:min-h-[48px] max-h-[120px] sm:max-h-[150px] text-base touch-manipulation"
                    disabled={isLoading}
                    rows={1}
                    style={{ height: 'auto' }}
                    aria-label="Message input"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="true"
                    inputMode="text"
                  />
                  {input.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setInput('')
                        if (textareaRef.current) {
                          textareaRef.current.style.height = 'auto'
                        }
                      }}
                      className="absolute right-2 sm:right-3 bottom-2.5 sm:bottom-3 text-[var(--blur-text-muted)] hover:text-[var(--blur-orange)] active:text-[var(--blur-orange-bright)] transition-colors touch-manipulation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="h-11 sm:h-12 px-4 sm:px-5 bg-gradient-to-br from-[var(--blur-orange)] to-[var(--blur-orange-bright)] hover:shadow-xl hover:shadow-[var(--blur-orange)]/20 active:scale-95 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                  )}
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2 mt-2 sm:mt-3 px-1">
                <p className="text-[10px] sm:text-xs text-[var(--blur-text-muted)]">
                  ⚡ Powered by OI Trader AI
                </p>
                <p className="text-[10px] sm:text-xs text-[var(--blur-text-muted)]">
                  💡 <kbd className="px-1 sm:px-1.5 py-0.5 bg-[var(--blur-bg-tertiary)] text-[var(--blur-orange)] rounded text-[9px] sm:text-[10px] font-mono border border-[var(--blur-orange)]/20">Enter</kbd> send • <kbd className="px-1 sm:px-1.5 py-0.5 bg-[var(--blur-bg-tertiary)] text-[var(--blur-orange)] rounded text-[9px] sm:text-[10px] font-mono border border-[var(--blur-orange)]/20">Shift+Enter</kbd> new line
                </p>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
