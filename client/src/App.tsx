import React, { useState } from 'react'
import { ChatBox } from './components/ChatBox'
import { ChatInput } from './components/ChatInput'
import { useAgent } from './hooks/useAgent'
import './index.css'

function App() {
  const { messages, isLoading, error, sendQuestion } = useAgent()
  const [userId, setUserId] = useState(() => localStorage.getItem('userId') || '')
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')

  const handleUserIdChange = (newUserId: string) => {
    setUserId(newUserId)
    localStorage.setItem('userId', newUserId)
  }

  const handleTokenChange = (newToken: string) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  const handleSend = (question: string, currentUserId: string, currentToken: string) => {
    sendQuestion(question, currentUserId, currentToken)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Company Agent</h1>
        <p>Intelligent search across code, teams, and company knowledge</p>
      </header>

      <main className="app-main">
        <ChatBox messages={messages} isLoading={isLoading} />

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          userId={userId}
          token={token}
          onUserIdChange={handleUserIdChange}
          onTokenChange={handleTokenChange}
        />
      </main>
    </div>
  )
}

export default App
