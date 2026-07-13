import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { getConfig } from "../config/env";
import type { UserContext } from "../types";

interface GitHubSearchResult {
  items: Array<{
    name: string;
    path: string;
    repository: {
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
    };
    html_url: string;
  }>;
}

interface GitHubIssueResult {
  items: Array<{
    title: string;
    body: string;
    html_url: string;
    repository_url: string;
    number: number;
    state: string;
  }>;
}

export class GitHubRetriever extends BaseRetriever {
  lc_namespace = ["company-agent", "retrievers", "github"];

  private userContext: UserContext;
  private org: string | undefined;
  private serviceToken: string | undefined;

  constructor(userContext: UserContext, fields?: BaseRetrieverInput) {
    super(fields);
    this.userContext = userContext;
    const config = getConfig();
    this.org = config.GITHUB_ORG;
    this.serviceToken = config.GITHUB_TOKEN;
  }

  override async _getRelevantDocuments(
    query: string
  ): Promise<Document[]> {
    if (!this.org || !this.serviceToken) {
      throw new Error(
        "GitHub credentials not configured. Set GITHUB_TOKEN and GITHUB_ORG in environment."
      );
    }

    const documents: Document[] = [];

    try {
      // Search for code
      const codeResults = await this.searchCode(query);
      documents.push(...codeResults);

      // Search for issues and PRs
      const issueResults = await this.searchIssues(query);
      documents.push(...issueResults);

      // Filter documents by user's access permissions
      const filteredDocs = await this.filterByUserAccess(documents);

      return filteredDocs;
    } catch (error) {
      throw error;
    }
  }

  private async searchCode(query: string): Promise<Document[]> {
    const searchQuery = `${query}+org:${this.org}`;
    const url = `https://api.github.com/search/code?q=${encodeURIComponent(searchQuery)}&per_page=10`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.serviceToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub code search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GitHubSearchResult;

    return data.items.map((item) => {
      return new Document({
        pageContent: `File: ${item.path}\nRepository: ${item.repository.full_name}\nURL: ${item.html_url}`,
        metadata: {
          source: "github",
          repo: item.repository.full_name,
          filePath: item.path,
          url: item.html_url,
          visibility: item.repository.private ? "private" : "public",
          type: "code",
        },
      });
    });
  }

  private async searchIssues(query: string): Promise<Document[]> {
    const searchQuery = `${query}+org:${this.org}+type:issue`;
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=5`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.serviceToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub issue search failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as GitHubIssueResult;

    return data.items.map((item) => {
      const repoName = item.repository_url.split("/").slice(-2).join("/");
      return new Document({
        pageContent: `Issue #${item.number}: ${item.title}\n\n${item.body || "(no description)"}`,
        metadata: {
          source: "github",
          repo: repoName,
          url: item.html_url,
          visibility: "public",
          type: "issue",
        },
      });
    });
  }

  private async filterByUserAccess(documents: Document[]): Promise<Document[]> {
    const filtered: Document[] = [];

    for (const doc of documents) {
      const visibility = doc.metadata?.visibility as string | undefined;

      // Public repos don't need permission checks
      if (visibility === "public") {
        filtered.push(doc);
        continue;
      }

      // Check permission for private repos
      const hasAccess = await this.checkRepoAccess(doc.metadata?.repo as string);
      if (hasAccess) {
        filtered.push(doc);
      }
    }

    return filtered;
  }

  private async checkRepoAccess(repo: string): Promise<boolean> {
    const url = `https://api.github.com/repos/${repo}/collaborators/${this.userContext.userId}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.serviceToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      // 204 No Content = user is a collaborator
      return response.status === 204;
    } catch {
      return false;
    }
  }
}
