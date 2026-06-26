import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LLM_PROVIDER: z.enum(["claude", "ollama"]).default("claude"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen3.6:27b"),
  GITHUB_TOKEN: z.string(),
  GITHUB_ORG: z.string(),
  MS_TENANT_ID: z.string(),
  MS_CLIENT_ID: z.string(),
  MS_CLIENT_SECRET: z.string(),
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

  if (!config.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is required");
  }

  if (!config.GITHUB_ORG) {
    throw new Error("GITHUB_ORG is required");
  }

  if (!config.MS_TENANT_ID || !config.MS_CLIENT_ID || !config.MS_CLIENT_SECRET) {
    throw new Error("MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET are all required");
  }

  return config;
}

export function getConfig(): Config {
  if (!config) {
    throw new Error("Config not initialized. Call initConfig() first.");
  }
  return config;
}
