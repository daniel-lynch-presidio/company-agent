import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { TeamsRetriever } from "../retrievers/teams";
import type { UserContext } from "../types";

export function createTeamsTool(userContext: UserContext): DynamicStructuredTool {
  const retriever = new TeamsRetriever(userContext);

  return new DynamicStructuredTool({
    name: "search_teams_messages",
    description: `Search Microsoft Teams messages and conversations.
      Use this tool when the question is about: team discussions, decisions made in chat,
      project updates, announcements, team announcements, meeting notes, or anything
      communicated through Teams channels. Returns message content with author,
      timestamp, and team/channel context. Only returns messages from teams the user has access to.`,
    schema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant Teams messages (e.g., 'Q4 planning', 'release schedule')"),
    }),
    func: async ({ query }) => {
      const docs = await retriever._getRelevantDocuments(query);

      if (docs.length === 0) {
        return "No Teams messages found for this query.";
      }

      return docs
        .map((doc: any) => {
          const teamName = doc.metadata?.teamName as string;
          const author = doc.metadata?.author as string;
          const timestamp = doc.metadata?.timestamp as string;
          const url = doc.metadata?.url as string;

          const date = new Date(timestamp).toLocaleString();
          return `[${teamName}] ${author} at ${date}\nURL: ${url}\n\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
    },
  });
}
