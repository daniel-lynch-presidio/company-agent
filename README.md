# Company Agent — RAG Chatbot Monorepo

A full-stack AI chatbot system with:
- **Backend**: LangChain.js RAG agent retrieving from GitHub & Microsoft Teams
- **Frontend**: React.js web UI with real-time streaming responses

## Project Structure

```
company-agent/
├── agent/              # Backend RAG agent (Bun + TypeScript + LangChain)
├── client/             # Frontend chatbot UI (React + TypeScript + Vite)
├── CLAUDE.md           # Codebase guidance for Claude Code
└── package.json        # Monorepo root (Bun workspaces)
```

## Getting Started

### Prerequisites
- [Bun](https://bun.sh) >= 1.3.14
- GitHub personal access token (PAT) for code search
- Microsoft Graph API credentials for Teams access

### 1. Install Dependencies

```bash
bun install
```

This installs dependencies for both `agent` and `client` workspaces.

### 2. Configure Environment

**Agent backend** (`agent/.env.local`):
```env
NODE_ENV=development
PORT=3000
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...
GITHUB_ORG=mycompany
MS_TENANT_ID=...
MS_CLIENT_ID=...
MS_CLIENT_SECRET=...
```

**Client frontend** (`client/.env.local`):
```env
VITE_AGENT_API_URL=http://localhost:3000
```

### 3. Run Both Projects

From root:
```bash
bun run dev
```

This starts:
- **Agent backend**: http://localhost:3000 (Hono HTTP server)
- **Client frontend**: http://localhost:5173 (Vite dev server)

### Individual Commands

**Agent only:**
```bash
bun --cwd agent run dev         # Start dev server
bun --cwd agent run build       # Build
bun --cwd agent run typecheck   # Type check
bun --cwd agent run lint        # Lint
```

**Client only:**
```bash
bun --cwd client run dev        # Start dev server
bun --cwd client run build      # Build
bun --cwd client run typecheck  # Type check
```

## Architecture

### Backend (Agent)

**Data Retrieval:**
- GitHub Search API — code, issues, PRs (permission-aware)
- MS Graph Search API — Teams messages & conversations

**Agent Flow:**
1. User question → HTTP POST `/ask`
2. Retrievers fetch from GitHub & Teams
3. LLM (Claude/Ollama) reasons over results
4. Response streams back as NDJSON
5. Citations extracted and returned

**Key Files:**
- `agent/src/agents/companyAgent.ts` — tool-calling loop
- `agent/src/retrievers/` — data source adapters
- `agent/src/server/index.ts` — HTTP server
- `agent/src/config/llm.ts` — LLM provider selection

### Frontend (Client)

**User Interface:**
- Chat message history with real-time streaming
- Authentication UI (GitHub username + MS Graph token)
- Citation display with source links
- Loading and error states

**Key Files:**
- `client/src/App.tsx` — root component
- `client/src/api/agent.ts` — NDJSON streaming client
- `client/src/hooks/useAgent.ts` — state + API integration
- `client/src/components/` — UI components

## API Contract

### POST /ask

**Request:**
```json
{
  "question": "How is authentication implemented?",
  "userId": "github-username",
  "userToken": "ms-graph-bearer-token",
  "githubToken": "optional-github-pat",
  "sessionId": "optional-uuid"
}
```

**Response:** NDJSON stream
```
{"type":"chunk","content":"The auth system...","sessionId":"..."}
{"type":"chunk","content":" uses OAuth 2.0...","sessionId":"..."}
{"type":"done","citations":[{"sourceType":"github","url":"...","title":"..."}],"sessionId":"..."}
```

## Development

For detailed architectural notes, see [CLAUDE.md](./CLAUDE.md).

**LLM Providers:**
- `claude` (default) — Claude 3.5 Sonnet via Anthropic API
- `ollama` — Qwen 3.6:27b locally (requires `ollama pull qwen3.6:27b`)

Switch with `LLM_PROVIDER` env var.

## Deployment

To build production bundles:

```bash
bun run build
```

Outputs:
- `agent/dist/index.js` — backend bundle
- `client/dist/` — frontend static files

## License

Proprietary — Company use only.
