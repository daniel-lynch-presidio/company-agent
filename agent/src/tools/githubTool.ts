import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { GitHubRetriever } from "../retrievers/github";
import type { UserContext } from "../types";

export function createGitHubTool(userContext: UserContext): DynamicStructuredTool {
  const retriever = new GitHubRetriever(userContext);

  return new DynamicStructuredTool({
    name: "search_github",
    description: `Search the company's GitHub organization for code, issues, and pull requests.
      Use this tool when the question is about: source code, implementation details,
      technical decisions, bug reports, feature requests, code examples, or repository contents.
      Returns relevant code snippets and issue text with source links.
      Only returns content the requesting user has access to.`,
    schema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant code or issues (e.g., 'authentication flow', 'database migration')"),
    }),
    func: async ({ query }) => {
      const docs = await retriever._getRelevantDocuments(query);

      if (docs.length === 0) {
        return "No GitHub results found for this query.";
      }

      return docs
        .map((doc: any) => {
          const repo = doc.metadata?.repo as string;
          const url = doc.metadata?.url as string;
          const type = doc.metadata?.type as string;
          return `[${type.toUpperCase()}] ${repo}\nURL: ${url}\n\n${doc.pageContent}`;
        })
        .join("\n\n---\n\n");
    },
  });
}
