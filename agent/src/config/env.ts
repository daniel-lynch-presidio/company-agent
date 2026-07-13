import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LLM_PROVIDER: z.enum(["claude", "ollama", "bedrock"]).default("claude"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen3.6:27b"),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  BEDROCK_MODEL_ID: z.string().default("anthropic.claude-3-5-sonnet-20241022-v2:0"),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_ORG: z.string().optional(),
  MS_TENANT_ID: z.string().optional(),
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
});

type Config = z.infer<typeof envSchema>;

let config: Config;

export function initConfig(): Config {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Environment validation failed:", parsed.error.flatten());
    throw new Error("Invalid environment variables");
  }

  config = parsed.data;

  if (config.LLM_PROVIDER === "claude" && !config.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY required when LLM_PROVIDER=claude");
  }

  if (config.LLM_PROVIDER === "bedrock" && !config.AWS_REGION) {
    throw new Error("AWS_REGION required when LLM_PROVIDER=bedrock");
  }

  // GitHub and Teams are optional in development mode
  // They will be required at runtime when the agent tries to use them
  if (config.NODE_ENV === "production") {
    if (!config.GITHUB_TOKEN) {
      throw new Error("GITHUB_TOKEN required in production");
    }
    if (!config.GITHUB_ORG) {
      throw new Error("GITHUB_ORG required in production");
    }
    if (!config.MS_TENANT_ID || !config.MS_CLIENT_ID || !config.MS_CLIENT_SECRET) {
      throw new Error("MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET required in production");
    }
  }

  return config;
}

export function getConfig(): Config {
  if (!config) {
    throw new Error("Config not initialized. Call initConfig() first.");
  }
  return config;
}
