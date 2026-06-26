# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

A company AI agent that answers questions by retrieving data from multiple sources:
- **Technical**: code repositories (GitHub/Azure DevOps)
- **Internal**: Microsoft Teams messages, SharePoint documents, wikis, and policies

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) (package manager, test runner, script runner)
- **Language**: TypeScript (strict mode)
- **AI / RAG**: LangChain.js (`langchain`, `@langchain/core`, `@langchain/community`)
- **LLMs**:
  - **Claude** (Anthropic) — primary reasoning and tool-calling agent via `@langchain/anthropic`
  - **Qwen3.6:27b** (local) — secondary/offline LLM via Ollama (`@langchain/ollama`); used for cost-sensitive or air-gapped tasks
- **Vector store**: (TBD — likely Chroma or Pinecone for embeddings)
- **HTTP server**: Hono or Bun's built-in HTTP (lightweight, no Express)

## Commands

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
src/
  agents/         # LangChain agent definitions and orchestration
  retrievers/     # One retriever per data source (github, sharepoint, teams, …)
  tools/          # LangChain Tool wrappers around retrievers and APIs
  loaders/        # Document loaders for ingestion pipelines
  chains/         # Reusable LangChain chains (QA, summarization, routing)
  server/         # HTTP server, route handlers, middleware
  config/         # Env/config loading (no raw process.env outside this folder)
  types/          # Shared TypeScript interfaces and Zod schemas
  utils/          # Pure helper functions (no LangChain or HTTP dependencies)
tests/
  unit/           # Fast, no network
  integration/    # Hits real or mocked external services
```

## Architecture

The agent follows a **retrieval-augmented generation (RAG)** pattern with a router:

1. **Ingest pipeline** (`src/loaders/`) — crawls each source (SharePoint, GitHub, Teams), chunks documents, and upserts embeddings into the vector store. Run as a scheduled job, not on-request.
2. **Retriever layer** (`src/retrievers/`) — each file wraps one data source and exposes a LangChain `BaseRetriever`. Retrievers are composable via `EnsembleRetriever` or a routing chain.
3. **Tool layer** (`src/tools/`) — wraps retrievers as LangChain `DynamicTool` or `StructuredTool` so the agent can decide which sources to query.
4. **Agent** (`src/agents/`) — a tool-calling agent that receives a user question, calls tools as needed, and returns a cited answer. The LLM backing the agent is swappable via `src/config/llm.ts` (see LLM Routing below).
5. **Server** (`src/server/`) — thin HTTP layer; accepts `{ question, sessionId }`, streams the agent response, returns citations.

## LLM Routing

LLM selection is centralised in `src/config/llm.ts`. No code outside that file should import `@langchain/anthropic` or `@langchain/ollama` directly.

```
LLM_PROVIDER=claude   → ChatAnthropic (claude-sonnet-4-6 default)
LLM_PROVIDER=ollama   → ChatOllama    (model: qwen3.6:27b, baseUrl: http://localhost:11434)
```

The exported `getLLM()` factory returns a `BaseChatModel` so all agents and chains remain provider-agnostic. Switch providers by changing `LLM_PROVIDER` in `.env.local` — no code changes needed.

**Ollama prerequisite**: Qwen3.6:27b must be pulled locally before use:
```bash
ollama pull qwen3.6:27b   # ~18 GB download
```

## Key Conventions

- All environment variables must be accessed through `src/config/env.ts` (validated with Zod at startup — fail fast if required vars are missing).
- Retrievers must implement the `BaseRetriever` interface so they are swappable.
- Every Tool must include a clear `description` string — the agent uses it for routing decisions.
- Use `langchain`'s built-in callbacks (`CallbackManager`) for tracing/logging rather than ad-hoc `console.log`.
- Streaming responses: prefer `streamEvents` / `streamLog` from LangChain over buffering full responses.
- Secrets (OAuth tokens, API keys) are never hardcoded; use `.env.local` for local dev, a secrets manager in production.

## Testing

- Unit tests live in `tests/unit/` and mock all external calls.
- Integration tests in `tests/integration/` require real credentials (skip in CI unless secrets are available).
- Use `bun:test` (built-in) — no Jest or Vitest needed.
- Test files follow `*.test.ts` naming.
