/**
 * Default prompt for the TaskAgent.
 * Receives task inputs and instructs the LLM to respond in JSON.
 * 
 * @param inputs - The inputs to the TaskAgent.
 * @return {string} The prompt for the TaskAgent.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function taskAgentPrompt(inputs: Record<string, unknown>): string {
  return `You are an agent.

Task input:
\`\`\`
${JSON.stringify(inputs, null, 2)}
\`\`\`

Perform a strict character-by-character comparison of the inputs. Respond in JSON format with the following schema:

{
    "response": ...
}`;
}
