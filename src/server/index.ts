import { Hono } from "hono";
import { getConfig } from "../config/env";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

app.post("/ask", async (c) => {
  const body = await c.req.json<{ question: string; sessionId?: string }>();
  const { question, sessionId } = body;

  if (!question) {
    return c.json({ error: "question is required" }, 400);
  }

  return c.json({
    sessionId: sessionId || crypto.randomUUID(),
    question,
    answer: "Agent not yet implemented",
    citations: [],
  });
});

export function startServer(): void {
  const config = getConfig();
  const port = config.PORT;

  console.log(`🚀 Server starting on port ${port}...`);
  console.log(`📊 LLM Provider: ${config.LLM_PROVIDER}`);
}

export default app;
