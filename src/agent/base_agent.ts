import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { StructuredTool } from "@langchain/core/tools";
import { createLLM, type LLMConfig } from "./llm";
import { ToolRegistry } from "./tool_registry";

export interface AgentOptions {
  model?: string;
  llmConfig?: LLMConfig;
  llm?: BaseChatModel;
  tools?: StructuredTool[];
  logFile?: string;
  /** Path to a prompt file. If set, the agent reads its system prompt from this file
   *  at runtime instead of using the hardcoded default. This enables the MetaAgent
   *  to edit prompt files in the user's workspace — including its own. */
  promptFile?: string;
}

/**
 * A base class for all agent systems.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export abstract class AgentSystem {
  protected model: string;
  protected llm: BaseChatModel;
  protected toolRegistry: ToolRegistry;
  protected log: (...args: unknown[]) => void;

  /**
   * Create a new agent system.
   * 
   * @param options - The options for the agent.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  constructor(options: AgentOptions = {}) {
    this.model = options.model ?? "openai/gpt-4o";
    this.llm = options.llm ?? createLLM(options.llmConfig ?? { model: this.model });
    this.toolRegistry = new ToolRegistry();

    if (options.tools) {
      this.toolRegistry.registerMany(options.tools);
    }

    this.log = this.createLogger(options.logFile);
  }

  /**
   * Create a logger for the agent.
   * 
   * @param logFile - The file to log to.
   * 
   * @return {Function} The logger function.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  private createLogger(logFile?: string): (...args: unknown[]) => void {
    if (!logFile) {
      return (...args: unknown[]) => console.log("[HyperAgents]", ...args);
    }

    const fs = require("fs");
    const stream = fs.createWriteStream(logFile, { flags: "a" });
    return (...args: unknown[]) => {
      const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      stream.write(`${new Date().toISOString()} ${line}\n`);
      console.log("[HyperAgents]", ...args);
    };
  }

  /**
   * Forward the input to the agent.
   * 
   * @param input - The input to the agent.
   * 
   * @return {Promise<unknown>} The output of the agent.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  abstract forward(...args: unknown[]): Promise<unknown>;
}
