import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  LLM_PROVIDER: z.enum(["claude", "ollama"]).default("claude"),
  ANTHROPIC_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().default("qwen3.6:27b"),
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

  return config;
}

export function getConfig(): Config {
  if (!config) {
    throw new Error("Config not initialized. Call initConfig() first.");
  }
  return config;
}
