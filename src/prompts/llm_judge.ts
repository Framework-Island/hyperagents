export interface LLMJudgePromptOptions {
  description: string;
  groundTruth?: string;
  rubric?: string;
  prediction: string;
}

/**
 * Default prompt for the LLMJudge.
 * 
 * @param options - The options for the LLMJudge.
 * @return {string} The prompt for the LLMJudge.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export function llmJudgePrompt(options: LLMJudgePromptOptions): string {
  const { description, groundTruth, rubric, prediction } = options;

  const groundTruthSection = groundTruth
    ? `\nExpected/reference answer: ${groundTruth}`
    : "";

  const rubricSection = rubric
    ? `\nScoring rubric: ${rubric}`
    : "";

  return `You are an impartial judge evaluating an AI agent's output.

Task description: ${description}${groundTruthSection}${rubricSection}

Agent's output:
${prediction}

Score this output on a scale from 0.0 to 1.0:
- 1.0 = perfect, fully correct and complete
- 0.5 = partially correct or incomplete
- 0.0 = wrong or irrelevant

Consider: accuracy, completeness, relevance, and quality.

Respond ONLY with JSON: { "score": <number>, "reason": "<brief explanation>" }`;
}
