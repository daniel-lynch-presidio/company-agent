import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";

const SYSTEM_PROMPT = `You are a company knowledge assistant with access to two sources:

1. **GitHub** (search_github) — company repositories, code, issues, and pull requests
2. **Microsoft Teams** (search_teams_messages) — team discussions, decisions, announcements, and project updates

When answering questions:
- Determine which tool(s) would be most helpful
- Use search_github for code, implementation, bugs, features
- Use search_teams_messages for discussions, decisions, announcements
- Include source URLs in your answer
- Never make up information

Format your response with citations like: [Source: https://...]`;

export async function* companyAgent(
  llm: BaseChatModel,
  tools: DynamicStructuredTool[],
  question: string
): AsyncGenerator<string> {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const messages: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(question),
  ];

  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations += 1;

    try {
      const response = await llm.invoke(messages);
      const content = response.content;

      if (typeof content === "string") {
        yield content;
        break;
      } else if (Array.isArray(content)) {
        let hasToolCall = false;

        for (const block of content) {
          if (typeof block === "string") {
            yield block;
          } else if ((block as any).type === "text") {
            yield (block as any).text;
          } else if ((block as any).type === "tool_use") {
            hasToolCall = true;
            const toolName = (block as any).name as string;
            const toolInput = (block as any).input as Record<string, unknown>;
            const tool = toolMap.get(toolName);

            if (tool) {
              const toolResult = await tool.func(toolInput);
              messages.push(response as BaseMessage);
              messages.push(
                new HumanMessage(`Tool result from ${toolName}: ${toolResult}`)
              );
            }
          }
        }

        if (!hasToolCall) {
          break;
        }
      } else {
        break;
      }
    } catch (error) {
      throw error;
    }
  }
}
