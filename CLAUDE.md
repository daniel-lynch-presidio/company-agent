# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

This is a monorepo containing two projects:

### `agent/` — Backend RAG Agent (Bun + TypeScript)
A company AI agent that answers questions by retrieving data from multiple sources and streaming responses via HTTP.

Data sources:
- **Technical**: GitHub repositories (code, issues, PRs)
- **Internal**: Microsoft Teams messages and conversations

### `client/` — Frontend Chatbot UI (React + TypeScript)
A React.js web application that serves as the chatbot interface, communicating with the agent backend via the `/ask` API.

---

## Agent Project (`agent/` folder)

### Tech Stack
- **Runtime**: [Bun](https://bun.sh) (package manager, test runner, script runner)
- **Language**: TypeScript (strict mode)
- **AI / RAG**: LangChain.js (`langchain`, `@langchain/core`, `@langchain/community`)
- **LLMs**:
  - **Claude** (Anthropic) — primary reasoning and tool-calling agent via `@langchain/anthropic`
  - **Qwen3.6:27b** (local) — secondary/offline LLM via Ollama (`@langchain/ollama`); used for cost-sensitive or air-gapped tasks
- **Vector store**: (TBD — likely Chroma or Pinecone for embeddings)
- **HTTP server**: Hono (lightweight, no Express)

### Commands (run from `agent/` folder)

```bash
bun install          # install dependencies
bun run dev          # start dev server with hot reload
bun run build        # compile TypeScript
bun test             # run all tests
bun test <file>      # run a single test file
bun run lint         # eslint check
bun run typecheck    # tsc --noEmit
```

## Folder Structure

```
agent/                # Backend agent service
  src/
    agents/           # LangChain agent definitions and orchestration
    retrievers/       # Data source retrievers (github, teams)
    tools/            # LangChain Tool wrappers around retrievers
    loaders/          # Document loaders for ingestion pipelines (future)
    chains/           # Reusable LangChain chains (future)
    server/           # HTTP server (Hono), routes, middleware
    config/           # Env/config loading (no raw process.env outside this folder)
    types/            # Shared TypeScript interfaces and Zod schemas
    utils/            # Pure helper functions
  tests/
    unit/             # Fast, no network
    integration/      # Hits real or mocked external services
  package.json
  tsconfig.json
  .env.example

client/               # Frontend chatbot UI
  src/
    components/       # React components
    pages/            # Page-level components
    hooks/            # Custom React hooks
    types/            # TypeScript interfaces
    api/              # API client for agent backend
    styles/           # CSS/styling
  public/             # Static assets
  package.json
  tsconfig.json
  .env.example
```

## System Architecture

### Overall Flow
```
Client (React) 
  → POST /ask { question, userId, userToken, sessionId }
  → Agent Backend (Hono)
  → Retrievers (GitHub, Teams)
  → LLM (Claude or Ollama)
  → NDJSON stream { type: "chunk"|"done"|"error", content, citations }
  → Client streams response and displays citations
```

### Agent Backend Architecture

The agent follows a **retrieval-augmented generation (RAG)** pattern:

1. **Retriever layer** (`agent/src/retrievers/`) — each retriever wraps one data source:
   - `github.ts` — GitHub Search API with permission filtering
   - `teams.ts` — MS Graph Search API with delegated auth
   
2. **Tool layer** (`agent/src/tools/`) — wraps retrievers as LangChain `DynamicStructuredTool`:
   - `githubTool.ts` — searches GitHub code, issues, PRs
   - `teamsTool.ts` — searches Teams messages and conversations
   
3. **Agent** (`agent/src/agents/companyAgent.ts`) — manual tool-calling loop:
   - LLM invokes with question
   - Yields text chunks as they flow
   - Detects tool calls, executes them, continues
   - Max 10 iterations per request
   
4. **Server** (`agent/src/server/`) — Hono HTTP server:
   - `POST /ask` accepts question + user context
   - Streams NDJSON response with citations
   - No buffering; chunks flow immediately
   
5. **Ingest pipeline** (`agent/src/loaders/`) — future: crawls sources, chunks documents, upserts to vector store. Run as scheduled job, not on-request.

## Client Project (`client/` folder)

### Tech Stack
- **Framework**: React 18+ (TypeScript)
- **Build tool**: Vite or similar (determined at client setup)
- **HTTP client**: fetch or Axios for agent backend communication
- **Styling**: CSS-in-JS or Tailwind (TBD)
- **State**: React hooks or lightweight state management (TBD)

### API Contract with Agent
The client communicates with the agent backend via `POST /ask`:

**Request:**
```json
{
  "question": "How is authentication implemented?",
  "userId": "github-username",
  "userToken": "ms-graph-bearer-token",
  "githubToken": "optional-github-pat",
  "sessionId": "optional-uuid-for-continuity"
}
```

**Response:** NDJSON stream
```
{"type":"chunk","content":"The authentication...","sessionId":"..."}
{"type":"chunk","content":" system uses OAuth...","sessionId":"..."}
{"type":"done","citations":[{"sourceType":"github","url":"...","title":"...","excerpt":""}],"sessionId":"..."}
```

## Agent: LLM Routing

LLM selection is centralised in `agent/src/config/llm.ts`. No code outside that file should import `@langchain/anthropic` or `@langchain/ollama` directly.

```
LLM_PROVIDER=claude   → ChatAnthropic (claude-sonnet-4-6 default)
LLM_PROVIDER=ollama   → ChatOllama    (model: qwen3.6:27b, baseUrl: http://localhost:11434)
```

The exported `getLLM()` factory returns a `BaseChatModel` so all agents and chains remain provider-agnostic. Switch providers by changing `LLM_PROVIDER` in `agent/.env.local` — no code changes needed.

**Ollama prerequisite**: Qwen3.6:27b must be pulled locally before use:
```bash
ollama pull qwen3.6:27b   # ~18 GB download
```

## Agent: Key Conventions

- All environment variables must be accessed through `agent/src/config/env.ts` (validated with Zod at startup — fail fast if required vars are missing).
- Retrievers must implement the `BaseRetriever` interface so they are swappable.
- Every Tool must include a clear `description` string — the agent uses it for routing decisions.
- Use `langchain`'s built-in callbacks (`CallbackManager`) for tracing/logging rather than ad-hoc `console.log`.
- Streaming responses: stream NDJSON chunks immediately, never buffer full responses.
- Secrets (OAuth tokens, API keys) are never hardcoded; use `agent/.env.local` for local dev, a secrets manager in production.
- No code outside `agent/src/config/llm.ts` should import `@langchain/anthropic` or `@langchain/ollama` directly.

## Agent: Testing

- Unit tests live in `agent/tests/unit/` and mock all external calls.
- Integration tests in `agent/tests/integration/` require real credentials (skip in CI unless secrets are available).
- Use `bun:test` (built-in) — no Jest or Vitest needed.
- Test files follow `*.test.ts` naming.

## Client: Development

- Run `client/` with its own package manager (npm/pnpm/yarn/bun — TBD at setup).
- Communicate with agent backend via `POST /ask`; parse NDJSON stream client-side.
- Render streamed response chunks in real-time.
- Display citations at end of response with source URLs.
- Handle errors gracefully (network, agent timeouts, invalid credentials).

---

## Environment Setup

### Agent Backend (`agent/.env.local`)
```
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

### Client (`client/.env.local`)
```
VITE_AGENT_API_URL=http://localhost:3000
```
