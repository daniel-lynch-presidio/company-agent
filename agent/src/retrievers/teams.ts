import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import type { UserContext } from "../types";

export class TeamsRetriever extends BaseRetriever {
  lc_namespace = ["company-agent", "retrievers", "teams"];

  private userContext: UserContext;

  constructor(userContext: UserContext, fields?: BaseRetrieverInput) {
    super(fields);
    this.userContext = userContext;
  }

  override async _getRelevantDocuments(query: string): Promise<Document[]> {
    try {
      const documents = await this.searchMessages(query);
      return documents;
    } catch (error) {
      throw error;
    }
  }

  private async searchMessages(query: string): Promise<Document[]> {
    const documents: Document[] = [];

    // First, get user's joined teams
    const teams = await this.getJoinedTeams();

    // Search in each team's channels
    for (const team of teams) {
      const teamDocs = await this.searchTeamChannels(team.id, team.displayName, query);
      documents.push(...teamDocs);
    }

    return documents;
  }

  private async getJoinedTeams(): Promise<
    Array<{ id: string; displayName: string }>
  > {
    const url = "https://graph.microsoft.com/v1.0/me/joinedTeams";

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.userContext.msToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch joined teams: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as { value: Array<{ id: string; displayName: string }> };
    return data.value || [];
  }

  private async searchTeamChannels(
    teamId: string,
    teamName: string,
    query: string
  ): Promise<Document[]> {
    const documents: Document[] = [];

    try {
      // Use MS Graph Search API to find messages
      const searchUrl = "https://graph.microsoft.com/v1.0/search/query";
      const searchPayload = {
        requests: [
          {
            entityTypes: ["chatMessage"],
            query: {
              queryString: query,
            },
          },
        ],
      };

      const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.userContext.msToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchPayload),
      });

      if (!response.ok) {
        throw new Error(
          `MS Graph search failed: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        value: Array<{
          hitsContainers: Array<{
            hits: Array<{
              hitId: string;
              summary: string;
              resource: {
                body: {
                  content: string;
                };
                from: {
                  user: {
                    displayName: string;
                  };
                };
                createdDateTime: string;
                webLink: string;
              };
            }>;
          }>;
        }>;
      };

      if (data.value && data.value[0]?.hitsContainers) {
        for (const container of data.value[0].hitsContainers) {
          for (const hit of container.hits || []) {
            const resource = hit.resource;
            const doc = new Document({
              pageContent: resource.body?.content || hit.summary || "(no content)",
              metadata: {
                source: "teams",
                teamName,
                teamId,
                messageId: hit.hitId,
                timestamp: resource.createdDateTime,
                author: resource.from?.user?.displayName || "Unknown",
                url: resource.webLink || "",
              },
            });
            documents.push(doc);
          }
        }
      }
    } catch (error) {
      // Log error but don't fail the entire retrieval
      console.error(`Error searching team ${teamName}:`, error);
    }

    return documents;
  }
}
