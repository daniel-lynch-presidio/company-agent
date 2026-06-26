import { StreamingMessage, Citation } from '../types/index'

const API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:3000'

export async function streamAgentResponse(
  question: string,
  sessionId: string,
  token: string,
  onChunk: (message: StreamingMessage) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        sessionId,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    // Handle NDJSON streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line) as StreamingMessage
            onChunk(data)
          } catch (parseError) {
            console.error('Failed to parse NDJSON line:', line, parseError)
          }
        }
      }
    }

    // Process any remaining data
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer) as StreamingMessage
        onChunk(data)
      } catch (parseError) {
        console.error('Failed to parse final buffer:', buffer, parseError)
      }
    }

    onChunk({ type: 'done' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    onError(errorMessage)
  }
}
