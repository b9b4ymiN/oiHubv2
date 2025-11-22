'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface ChartContext {
  type: 'price-oi' | 'options-iv' | 'volume-profile' | 'taker-flow' | 'oi-divergence' | 'general'
  data: any
  metadata?: {
    symbol?: string
    interval?: string
    timestamp?: number
    chartTitle?: string
  }
}

interface ChatContextState {
  context: ChartContext | null
  setContext: (context: ChartContext | null) => void
  clearContext: () => void
  addContextAndOpenChat: (context: ChartContext, question?: string) => void
  pendingQuestion: string | null
  setPendingQuestion: (question: string | null) => void
}

const ChatContext = createContext<ChatContextState | undefined>(undefined)

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<ChartContext | null>(null)
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)

  const setContext = (newContext: ChartContext | null) => {
    setContextState(newContext)
  }

  const clearContext = () => {
    setContextState(null)
    setPendingQuestion(null)
  }

  const addContextAndOpenChat = (chartContext: ChartContext, question?: string) => {
    setContextState(chartContext)
    if (question) {
      setPendingQuestion(question)
    }

    // Dispatch custom event to open chat modal
    window.dispatchEvent(new CustomEvent('openChatWithContext'))
  }

  return (
    <ChatContext.Provider
      value={{
        context,
        setContext,
        clearContext,
        addContextAndOpenChat,
        pendingQuestion,
        setPendingQuestion,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within ChatContextProvider')
  }
  return context
}
