import type { StructuredTool } from "@langchain/core/tools";
import { createBashTool } from "./bash";
import { createEditorTool } from "./editor";

export { createBashTool } from "./bash";
export { createEditorTool } from "./editor";

/**
 * Get the standard framework tools needed by the MetaAgent
 * to modify codebases in the self-improvement loop.
 */
export function getFrameworkTools(): StructuredTool[] {
  return [createBashTool(), createEditorTool()];
}
