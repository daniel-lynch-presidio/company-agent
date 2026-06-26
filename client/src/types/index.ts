export interface Citation {
  title: string
  source: string
  url?: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: number
}

export interface AgentResponse {
  message: string
  citations?: Citation[]
  sessionId: string
}

export interface StreamingMessage {
  type: 'chunk' | 'citation' | 'done' | 'error'
  content?: string
  citations?: Citation[]
  error?: string
}
