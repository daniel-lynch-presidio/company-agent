import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOllama } from "@langchain/ollama";
import { ChatBedrockConverse } from "@langchain/aws";
import { getConfig } from "./env";

type LLMInstance = ChatAnthropic | ChatOllama | ChatBedrockConverse;

let llmInstance: LLMInstance | null = null;

export function getLLM(): BaseChatModel {
  if (llmInstance) {
    console.log("[LLM] Returning cached LLM instance");
    return llmInstance;
  }

  const config = getConfig();
  console.log(`[LLM] Initializing LLM with provider: ${config.LLM_PROVIDER}`);

  if (config.LLM_PROVIDER === "claude") {
    console.log(`[LLM] Creating ChatAnthropic instance`);
    console.log(`[LLM] API Key present: ${!!config.ANTHROPIC_API_KEY}`);
    llmInstance = new ChatAnthropic({
      apiKey: config.ANTHROPIC_API_KEY,
      model: "claude-sonnet-4-6",
      temperature: 0.7,
    });
    console.log(`[LLM] ChatAnthropic instance created`);
  } else if (config.LLM_PROVIDER === "ollama") {
    console.log(`[LLM] Creating ChatOllama instance`);
    console.log(`[LLM] Base URL: ${config.OLLAMA_BASE_URL}`);
    console.log(`[LLM] Model: ${config.OLLAMA_MODEL}`);
    llmInstance = new ChatOllama({
      baseUrl: config.OLLAMA_BASE_URL,
      model: config.OLLAMA_MODEL,
      temperature: 0.7,
    });
    console.log(`[LLM] ChatOllama instance created`);
  } else if (config.LLM_PROVIDER === "bedrock") {
    console.log(`[LLM] Creating ChatBedrockConverse instance`);
    console.log(`[LLM] Region: ${config.AWS_REGION}`);
    console.log(`[LLM] Model ID: ${config.BEDROCK_MODEL_ID}`);
    llmInstance = new ChatBedrockConverse({
      region: config.AWS_REGION,
      model: config.BEDROCK_MODEL_ID,
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
      temperature: 0.7,
    });
    console.log(`[LLM] ChatBedrockConverse instance created`);
  } else {
    throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
  }

  return llmInstance;
}

export function resetLLM(): void {
  llmInstance = null;
}
