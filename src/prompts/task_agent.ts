import * as fs from "fs";

export const TASK_AGENT_PROMPT_TEMPLATE = `You are an agent.

Task input:
\`\`\`
{{inputs}}
\`\`\`

Perform a strict character-by-character comparison of the inputs. Respond in JSON format with the following schema:

{
    "response": ...
}`;

export interface TaskAgentPromptOptions {
  inputs: Record<string, unknown>;
  promptFile?: string;
}

/**
 * Default prompt for the TaskAgent.
 * Receives task inputs and instructs the LLM to respond in JSON.
 * If a promptFile is provided and exists, uses that template instead.
 * 
 * @param inputs - The inputs to the TaskAgent, or a TaskAgentPromptOptions object.
 * @return {string} The prompt for the TaskAgent.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function taskAgentPrompt(inputs: Record<string, unknown> | TaskAgentPromptOptions): string {
  let promptFile: string | undefined;
  let taskInputs: Record<string, unknown>;

  if ("inputs" in inputs && "promptFile" in inputs) {
    promptFile = (inputs as TaskAgentPromptOptions).promptFile;
    taskInputs = (inputs as TaskAgentPromptOptions).inputs;
  } else {
    taskInputs = inputs as Record<string, unknown>;
  }

  const inputJson = JSON.stringify(taskInputs, null, 2);

  const template = (promptFile && fs.existsSync(promptFile))
    ? fs.readFileSync(promptFile, "utf-8")
    : TASK_AGENT_PROMPT_TEMPLATE;

  return template.replace(/\{\{inputs\}\}/g, inputJson);
}
