import React, { useRef, useEffect } from 'react'
import { Message } from '../types/index'
import { CitationList } from './CitationList'

interface ChatBoxProps {
  messages: Message[]
  isLoading: boolean
}

export function ChatBox({ messages, isLoading }: ChatBoxProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="chat-box">
      {messages.length === 0 && !isLoading && (
        <div className="empty-state">
          <h2>Company Agent Chatbot</h2>
          <p>Ask questions about company resources, code, or policies.</p>
        </div>
      )}

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
            <div className="message-content">
              <p>{message.content}</p>
              {message.citations && message.citations.length > 0 && (
                <CitationList citations={message.citations} />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant loading">
            <div className="message-content">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
