import { z } from "zod";

export interface UserContext {
  userId: string;
  msToken: string;
  githubToken?: string;
}

export interface Citation {
  sourceType: "github" | "teams";
  url: string;
  title: string;
  excerpt: string;
  timestamp?: string;
  repoVisibility?: "public" | "private";
}

export interface AgentResponse {
  type: "chunk" | "done" | "error";
  content?: string;
  citations?: Citation[];
  sessionId?: string;
  error?: string;
}

export const AskRequestSchema = z.object({
  question: z.string().min(1, "Question is required"),
  sessionId: z.string().optional(),
  userId: z.string().min(1, "userId is required"),
  userToken: z.string().min(1, "userToken (MS Graph token) is required"),
  githubToken: z.string().optional(),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;
