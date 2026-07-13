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
  console.log("[Agent] Starting companyAgent");
  console.log(`[Agent] Question: "${question}"`);
  console.log(`[Agent] Available tools: ${tools.map((t) => t.name).join(", ")}`);

  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const messages: BaseMessage[] = [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(question),
  ];

  console.log(`[Agent] Initialized with ${messages.length} messages`);

  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations += 1;
    console.log(`[Agent] Iteration ${iterations}/${maxIterations}`);

    try {
      console.log(`[Agent] Invoking LLM with ${messages.length} messages...`);
      const response = await llm.invoke(messages);
      console.log(`[Agent] LLM response received`);
      console.log(`[Agent] Response type: ${typeof response.content}`);
      console.log(`[Agent] Response content: ${JSON.stringify(response.content).substring(0, 200)}`);

      const content = response.content;

      if (typeof content === "string") {
        console.log(`[Agent] Content is string, yielding: "${content.substring(0, 100)}..."`);
        yield content;
        console.log(`[Agent] String response complete, breaking`);
        break;
      } else if (Array.isArray(content)) {
        console.log(`[Agent] Content is array with ${content.length} blocks`);
        let hasToolCall = false;

        for (let i = 0; i < content.length; i++) {
          const block = content[i];
          console.log(`[Agent] Block ${i}: type=${typeof block}, keys=${typeof block === "object" ? Object.keys(block).join(",") : "N/A"}`);

          if (typeof block === "string") {
            console.log(`[Agent] Block ${i} is string, yielding`);
            yield block;
          } else if ((block as any).type === "text") {
            console.log(`[Agent] Block ${i} is text, yielding`);
            yield (block as any).text;
          } else if ((block as any).type === "tool_use") {
            console.log(`[Agent] Block ${i} is tool_use call`);
            hasToolCall = true;
            const toolName = (block as any).name as string;
            const toolInput = (block as any).input as Record<string, unknown>;
            console.log(`[Agent] Tool call: ${toolName} with input: ${JSON.stringify(toolInput)}`);

            const tool = toolMap.get(toolName);

            if (tool) {
              console.log(`[Agent] Executing tool: ${toolName}`);
              const toolResult = await tool.func(toolInput);
              console.log(`[Agent] Tool result: ${String(toolResult).substring(0, 200)}`);

              messages.push(response as BaseMessage);
              messages.push(
                new HumanMessage(`Tool result from ${toolName}: ${toolResult}`)
              );
              console.log(`[Agent] Added tool result to messages. Total: ${messages.length}`);
            } else {
              console.log(`[Agent] Tool not found: ${toolName}`);
            }
          } else {
            console.log(`[Agent] Block ${i} unknown type: ${JSON.stringify(block).substring(0, 100)}`);
          }
        }

        if (!hasToolCall) {
          console.log(`[Agent] No tool calls found, response complete`);
          break;
        }
      } else {
        console.log(`[Agent] Content is unexpected type, breaking`);
        break;
      }
    } catch (error) {
      console.error(`[Agent] Error in iteration ${iterations}:`, error);
      throw error;
    }
  }

  console.log(`[Agent] Agent loop completed after ${iterations} iterations`);
}
