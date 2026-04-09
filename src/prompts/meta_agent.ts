import * as fs from "fs";

export const META_AGENT_PROMPT_TEMPLATE = `You are an expert AI agent engineer. Your goal is to improve the agent system.

Modify any part of the codebase at \`{{repoPath}}\`.

Previous evaluation results are available at \`{{evalPath}}\`. Analyze them to understand what works and what doesn't, then make targeted improvements.
{{iterationsContext}}{{scoreContext}}
Focus on changes that will improve task performance. You can modify:
- The task agent's logic and prompts
- How inputs are processed
- How outputs are formatted
- Any utility functions
- This prompt file itself (to improve how you approach future improvements)

After making changes, briefly explain what you changed and why.`;

export interface MetaAgentPromptOptions {
  repoPath: string;
  evalPath: string;
  iterationsLeft?: number;
  parentScore?: number | null;
  promptFile?: string;
}

/**
 * Default prompt for the MetaAgent.
 * Instructs the LLM to analyze evaluations and modify the codebase.
 * When the parent score is perfect (1.0), instructs the agent to skip changes.
 * 
 * @param options - The options for the MetaAgent.
 * @return {string} The prompt for the MetaAgent.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function metaAgentPrompt(options: MetaAgentPromptOptions): string {
  const { repoPath, evalPath, iterationsLeft, parentScore, promptFile } = options;

  const iterationsContext =
    iterationsLeft != null
      ? `\nYou have ${iterationsLeft} iterations remaining to improve the agent.`
      : "";

  let scoreContext = "";
  if (parentScore != null) {
    const pct = (parentScore * 100).toFixed(1);
    if (parentScore >= 1.0) {
      scoreContext = `\nThe current agent scores ${pct}% (all tasks passing). Do NOT make changes unless you identify a clear robustness or efficiency improvement. If everything looks good, respond with "No changes needed." and make no edits.`;
    } else {
      scoreContext = `\nThe current agent scores ${pct}%. Focus your improvements on the failing tasks.`;
    }
  }

  const template = (promptFile && fs.existsSync(promptFile))
    ? fs.readFileSync(promptFile, "utf-8")
    : META_AGENT_PROMPT_TEMPLATE;

  return template
    .replace(/\{\{repoPath\}\}/g, repoPath)
    .replace(/\{\{evalPath\}\}/g, evalPath)
    .replace(/\{\{iterationsContext\}\}/g, iterationsContext)
    .replace(/\{\{scoreContext\}\}/g, scoreContext);
}
