import { AgentSystem, type AgentOptions } from "./base_agent";
import { chatWithAgent } from "./llm_with_tools";
import { taskAgentPrompt } from "../prompts/task_agent";
import { extractJsons } from "../utils/common";

export interface TaskInput {
  domain: string;
  [key: string]: unknown;
}

export interface TaskResult {
  prediction: string;
  messageHistory: unknown[];
}

/**
 * TaskAgent solves domain-specific tasks.
 *
 * In the original HyperAgents, the TaskAgent is intentionally minimal
 * so the MetaAgent can easily modify its behavior via code patches.
 */
export class TaskAgent extends AgentSystem {
  private promptFile?: string;

  constructor(options: AgentOptions = {}) {
    super(options);
    this.promptFile = options.promptFile;
  }

  /**
   * Forward the input to the TaskAgent.
   * 
   * @param inputs - The input to the TaskAgent.
   * @return {Promise<TaskResult>} The result of the TaskAgent.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async forward(inputs: TaskInput): Promise<TaskResult> {
    const instruction = this.promptFile
      ? taskAgentPrompt({ inputs, promptFile: this.promptFile })
      : taskAgentPrompt(inputs);
    const tools = this.toolRegistry.getAll();

    const { response, messages } = await chatWithAgent(instruction, {
      llm: this.llm,
      tools,
      log: this.log,
    });

    let prediction = "None";
    try {
      const extracted = extractJsons(response);
      if (extracted.length > 0 && "response" in extracted[extracted.length - 1]) {
        prediction = String(extracted[extracted.length - 1].response);
      }
    } catch (e) {
      this.log(`Error extracting prediction: ${e}`);
    }

    return {
      prediction,
      messageHistory: messages.map((m) => ({
        role: m.type,
        text: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      })),
    };
  }
}
