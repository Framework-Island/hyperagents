import { AgentSystem, type AgentOptions } from "./base_agent";
import { chatWithAgent } from "./llm_with_tools";
import { metaAgentPrompt, type MetaAgentPromptOptions } from "../prompts/meta_agent";
import { getFrameworkTools } from "../tools";

export type MetaAgentForwardOptions = MetaAgentPromptOptions;

/**
 * MetaAgent modifies the codebase to produce improved TaskAgents.
 *
 * It receives the repo path and evaluation history, then uses tools
 * (bash, editor, etc.) to modify any part of the codebase. This is
 * the "mutation operator" in the evolutionary self-improvement loop.
 *
 * Framework tools (bash + editor) are loaded automatically if no
 * tools are explicitly provided. You can pass additional tools
 * and they'll be merged with the framework tools.
 */
export class MetaAgent extends AgentSystem {
  private promptFile?: string;

  /**
   * Create a new MetaAgent.
   * 
   * @param options - The options for the MetaAgent.
   * @return {MetaAgent} The MetaAgent.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  constructor(options: AgentOptions = {}) {
    super(options);
    this.promptFile = options.promptFile;

    if (options.tools == null || options.tools.length === 0) {
      this.toolRegistry.registerMany(getFrameworkTools());
    }
  }

  /**
   * Forward the input to the MetaAgent.
   * 
   * @param options - The options for the MetaAgent.
   * @return {Promise<string>} The output of the MetaAgent.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  async forward(options: MetaAgentForwardOptions): Promise<string> {
    const instruction = metaAgentPrompt({
      ...options,
      promptFile: options.promptFile ?? this.promptFile,
    });
    const tools = this.toolRegistry.getAll();

    const { response } = await chatWithAgent(instruction, {
      llm: this.llm,
      tools,
      log: this.log,
    });

    return response;
  }
}
