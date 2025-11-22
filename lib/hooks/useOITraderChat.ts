'use client'

import { useState, useEffect } from 'react'
import { useChatContext } from '@/lib/contexts/ChatContextProvider'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  chart_context?: any // Chart context data attached to message
}

// Generate or retrieve persistent user ID for memory
function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'

  let userId = localStorage.getItem('oi-trader-user-id')
  if (!userId) {
    userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    localStorage.setItem('oi-trader-user-id', userId)
  }
  return userId
}

export function useOITraderChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string>('anonymous')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const { context } = useChatContext()

  // Initialize user ID on mount
  useEffect(() => {
    setUserId(getUserId())
  }, [])

  const sendMessage = async (content: string) => {
    console.log('[useOITraderChat] Sending message:', content)

    // Attach chart_context to user message if available
    const userMessage: Message = {
      role: 'user',
      content,
      chart_context: context ? {
        type: context.type,
        data: context.data,
        metadata: context.metadata
      } : undefined
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      console.log('[useOITraderChat] Calling API with messages:', updatedMessages)
      console.log('[useOITraderChat] Using user_id:', userId, 'session_id:', sessionId)
      console.log('[useOITraderChat] Context available:', context ? context.type : 'none')

      const requestBody: any = {
        messages: updatedMessages,
        user_id: userId,
      }

      // Include session_id if we have one (for memory continuation)
      if (sessionId) {
        requestBody.session_id = sessionId
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('[useOITraderChat] API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[useOITraderChat] API error response:', errorText)
        throw new Error(`Failed to get response: ${response.status}`)
      }

      const data = await response.json()
      console.log('[useOITraderChat] API response data:', data)
      
      // Store session_id for next request (memory persistence)
      if (data.session_id) {
        setSessionId(data.session_id)
        console.log('[useOITraderChat] Stored session_id for memory:', data.session_id)
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
      }

      setMessages((prev) => [...prev, assistantMessage])
      console.log('[useOITraderChat] Message added successfully')
    } catch (error) {
      console.error('[useOITraderChat] Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const clearMessages = () => {
    setMessages([])
    setSessionId(null) // Clear session to start fresh conversation
    console.log('[useOITraderChat] Cleared messages and session_id')
  }

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  }
}
