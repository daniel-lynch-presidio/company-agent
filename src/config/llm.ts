import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { getConfig } from "./env";

type LLMInstance = ChatAnthropic | ChatOllama;

let llmInstance: LLMInstance | null = null;

export function getLLM(): LLMInstance {
  if (llmInstance) {
    return llmInstance;
  }

  const config = getConfig();

  if (config.LLM_PROVIDER === "claude") {
    llmInstance = new ChatAnthropic({
      apiKey: config.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-6",
      temperature: 0.7,
    });
  } else if (config.LLM_PROVIDER === "ollama") {
    llmInstance = new ChatOllama({
      baseUrl: config.OLLAMA_BASE_URL,
      model: config.OLLAMA_MODEL,
      temperature: 0.7,
    });
  } else {
    throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }

  return llmInstance;
}

export function resetLLM(): void {
  llmInstance = null;
}
