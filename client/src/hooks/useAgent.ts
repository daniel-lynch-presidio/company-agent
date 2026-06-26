import { useState, useCallback } from 'react'
import { Message, Citation } from '../types/index'
import { streamAgentResponse } from '../api/agent'

export function useAgent() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  const sendQuestion = useCallback(
    async (question: string, userId: string, token: string) => {
      if (!question.trim()) return

      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      let assistantContent = ''
      let citations: Citation[] = []
      const assistantMessageId = `msg-${Date.now()}-assistant`

      await streamAgentResponse(
        question,
        sessionId,
        token,
        (chunk) => {
          if (chunk.type === 'chunk' && chunk.content) {
            assistantContent += chunk.content
            setMessages((prev) => {
              const existingIndex = prev.findIndex((m) => m.id === assistantMessageId)
              const assistantMessage: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: assistantContent,
                citations,
                timestamp: Date.now(),
              }

              if (existingIndex >= 0) {
                const newMessages = [...prev]
                newMessages[existingIndex] = assistantMessage
                return newMessages
              } else {
                return [...prev, assistantMessage]
              }
            })
          } else if (chunk.type === 'citation' && chunk.citations) {
            citations = [...chunk.citations]
            setMessages((prev) => {
              const lastMessage = prev[prev.length - 1]
              if (lastMessage && lastMessage.role === 'assistant') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, citations },
                ]
              }
              return prev
            })
          } else if (chunk.type === 'done') {
            setIsLoading(false)
          } else if (chunk.type === 'error' && chunk.error) {
            setError(chunk.error)
            setIsLoading(false)
          }
        },
        (errorMsg) => {
          setError(errorMsg)
          setIsLoading(false)
        }
      )
    },
    [sessionId]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendQuestion,
    clearMessages,
  }
}
