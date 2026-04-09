import { StructuredTool } from "@langchain/core/tools";

/**
 * A registry for tools that can be used by the agent
 * 
 * @example
 * const toolRegistry = new ToolRegistry();
 * toolRegistry.register(new Tool("echo", "Echo a message", async (message: string) => message));
 * toolRegistry.register(new Tool("echo", "Echo a message", async (message: string) => message));
 */
export class ToolRegistry {
  private tools: Map<string, StructuredTool> = new Map();

  /**
   * Register a new tool.
   * 
   * @param tool - The tool to register.
   * @return {void}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  register(tool: StructuredTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools.
   * 
   * @param tools - The tools to register.
   * @return {void}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  registerMany(tools: StructuredTool[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name.
   * 
   * @param name - The name of the tool.
   * @return {StructuredTool | undefined} The tool.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  get(name: string): StructuredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools.
   * 
   * @return {StructuredTool[]} The tools.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  getAll(): StructuredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered.
   * 
   * @param name - The name of the tool.
   * @return {boolean} True if the tool is registered, false otherwise.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names.
   * 
   * @return {string[]} The tool names.
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  names(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Clear the tool registry.
   * 
   * @return {void}
   * 
   * @since v1.0.0
   * @author Muhammad Umer Farooq<umer@lablnet.com>
   */
  clear(): void {
    this.tools.clear();
  }
}
