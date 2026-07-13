import { Hono } from "hono";
import { cors } from "hono/cors";
import { getConfig } from "../config/env";
import { getLLM } from "../config/llm";
import { companyAgent } from "../agents/companyAgent";
import { createGitHubTool } from "../tools/githubTool";
// import { createTeamsTool } from "../tools/teamsTool";
import { AskRequestSchema, type UserContext, type AgentResponse, type Citation } from "../types";

const app = new Hono();

// Enable CORS for the React frontend
app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Type"],
  })
);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/ask", async (c) => {
  try {
    const body = await c.req.json();
    const validation = AskRequestSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        { error: "Invalid request", details: validation.error.flatten() },
        400
      );
    }

    const { question, sessionId, userId, userToken, githubToken } = validation.data;
    const userContext: UserContext = {
      userId,
      msToken: userToken,
      githubToken,
    };

    c.header("Content-Type", "application/x-ndjson");
    c.header("Transfer-Encoding", "chunked");

    const responseSessionId = sessionId || crypto.randomUUID();
    const citations: Map<string, { url: string; title: string }> = new Map();

    const { readable, writable } = new TransformStream<Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    const write = async (payload: AgentResponse) => {
      await writer.write(encoder.encode(JSON.stringify(payload) + "\n"));
    };

    (async () => {
      try {
        console.log(`[${responseSessionId}] Processing question: ${question}`);

        const tools = [createGitHubTool(userContext),
          //createTeamsTool(userContext)
          ];
        const llm = getLLM();

        console.log(`[${responseSessionId}] Starting agent with ${tools.length} tools`);

        let chunkCount = 0;
        for await (const chunk of companyAgent(llm, tools, question)) {
          if (chunk) {
            chunkCount++;
            console.log(`[${responseSessionId}] Chunk ${chunkCount}: ${chunk.substring(0, 50)}...`);

            // Extract URLs from chunk
            const urlRegex = /URL:\s*(https?:\/\/[^\s]+)/g;
            const matches = chunk.matchAll(urlRegex);
            for (const match of matches) {
              const url = match[1];
              if (url && !citations.has(url)) {
                citations.set(url, {
                  url,
                  title: new URL(url).hostname,
                });
              }
            }
            await write({ type: "chunk", content: chunk, sessionId: responseSessionId });
          }
        }

        console.log(`[${responseSessionId}] Agent completed with ${chunkCount} chunks`);

        const citationsList: Citation[] = Array.from(citations.values()).map((c) => ({
          sourceType: c.url.includes("github") ? ("github" as const) : ("teams" as const),
          url: c.url,
          title: c.title,
          excerpt: "",
        }));

        console.log(`[${responseSessionId}] Sending done message with ${citationsList.length} citations`);
        await write({
          type: "done",
          citations: citationsList,
          sessionId: responseSessionId,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[${responseSessionId}] Error: ${errorMessage}`, error);
        try {
          await write({
            type: "error",
            error: errorMessage,
            sessionId: responseSessionId,
          });
        } catch (writeError) {
          console.error(`[${responseSessionId}] Failed to write error message:`, writeError);
        }
      } finally {
        try {
          await writer.close();
          console.log(`[${responseSessionId}] Stream closed`);
        } catch (closeError) {
          console.error(`[${responseSessionId}] Error closing stream:`, closeError);
        }
      }
    })();

    return c.body(readable);
  } catch (error) {
    return c.json(
      {
        error: "Request processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export function startServer(): void {
  const config = getConfig();
  const port = config.PORT;

  console.log(`🚀 Server starting on port ${port}...`);
  console.log(`📊 LLM Provider: ${config.LLM_PROVIDER}`);
}

export default app;
