'use client'

import { useState } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useOITraderChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = async (content: string) => {
    console.log('[useOITraderChat] Sending message:', content)
    const userMessage: Message = { role: 'user', content }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setIsLoading(true)

    try {
      console.log('[useOITraderChat] Calling API with messages:', updatedMessages)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      })

      console.log('[useOITraderChat] API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[useOITraderChat] API error response:', errorText)
        throw new Error(`Failed to get response: ${response.status}`)
      }

      const data = await response.json()
      console.log('[useOITraderChat] API response data:', data)
      
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
  }

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  }
}
