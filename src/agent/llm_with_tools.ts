import { createAgent } from "langchain";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredTool } from "@langchain/core/tools";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

export interface ChatWithAgentOptions {
  llm: BaseChatModel;
  tools: StructuredTool[];
  systemPrompt?: string;
  maxToolCalls?: number;
  log?: (...args: unknown[]) => void;
}

export interface ChatResult {
  response: string;
  messages: BaseMessage[];
}

/**
 * Run a ReAct-style agentic loop using LangGraph.
 *
 * The LLM reasons about the task, decides which tools to call,
 * observes tool outputs, and repeats until it produces a final answer.
 * 
 * @param input - The input to the agent.
 * @param options - The options for the agent.
 * @return {Promise<ChatResult>} The result of the chat with the agent.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function chatWithAgent(
  input: string,
  options: ChatWithAgentOptions
): Promise<ChatResult> {
  const { llm, tools, systemPrompt, maxToolCalls = 40, log = console.log } = options;

  const agent = createAgent({
    model: llm,
    tools,
    systemPrompt,
  });

  log(`[chatWithAgent] Input: ${input.slice(0, 200)}...`);

  const result = await agent.invoke(
    {
      messages: [new HumanMessage(input)],
    },
    {
      recursionLimit: maxToolCalls * 2 + 10,
    }
  );

  const messages: BaseMessage[] = result.messages;
  const lastMessage = messages[messages.length - 1];
  const response =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  log(`[chatWithAgent] Response: ${response.slice(0, 200)}...`);

  return { response, messages };
}
