import React, { useState, useRef } from 'react'

interface ChatInputProps {
  onSend: (question: string, userId: string, token: string) => void
  isLoading: boolean
  userId: string
  token: string
  onUserIdChange: (userId: string) => void
  onTokenChange: (token: string) => void
}

export function ChatInput({
  onSend,
  isLoading,
  userId,
  token,
  onUserIdChange,
  onTokenChange,
}: ChatInputProps) {
  const [question, setQuestion] = useState('')
  const [showAuth, setShowAuth] = useState(!userId || !token)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      onSend(question, userId, token)
      setQuestion('')
      inputRef.current?.focus()
    }
  }

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userId && token) {
      setShowAuth(false)
    }
  }

  if (showAuth) {
    return (
      <div className="auth-box">
        <h3>Authentication</h3>
        <form onSubmit={handleAuthSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="userId">User ID:</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => onUserIdChange(e.target.value)}
              placeholder="Enter your user ID"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="token">Auth Token:</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="Enter your auth token"
              required
            />
          </div>
          <button type="submit" disabled={!userId || !token}>
            Continue
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="chat-input-wrapper">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your company..."
          disabled={isLoading}
          className="chat-input"
        />
        <button type="submit" disabled={isLoading || !question.trim()} className="send-button">
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setShowAuth(true)}
        className="auth-button"
        title="Change authentication"
      >
        Change Auth
      </button>
    </div>
  )
}
