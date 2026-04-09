import { createLLM, type LLMConfig } from "../agent/llm";
import { extractJsons } from "../utils/common";
import { llmJudgePrompt } from "../prompts/llm_judge";

/**
 * Static evaluator: exact string match after normalization.
 * Free, fast, deterministic. Use for tasks with single correct answers.
 */
export function staticEvaluator(
  prediction: string,
  groundTruth: string
): number {
  const pred = prediction.toLowerCase().trim();
  const expected = groundTruth.toLowerCase().trim();
  return pred === expected ? 1.0 : 0.0;
}

/**
 * LLM judge evaluator: asks an LLM to score the prediction.
 * Use for subjective tasks where there's no single right answer
 * (e.g., "generate tasks from email", "write a review", "summarize text").
 *
 * The judge LLM scores on a 0-1 scale based on quality, relevance, and correctness.
 */
export async function llmJudgeEvaluator(
  prediction: string,
  task: {
    description: string;
    groundTruth?: string;
    rubric?: string;
  },
  config?: LLMConfig
): Promise<number> {
  const llm = createLLM(config ?? { model: "openai/gpt-4o", temperature: 0 });

  const prompt = llmJudgePrompt({
    description: task.description,
    groundTruth: task.groundTruth,
    rubric: task.rubric,
    prediction,
  });

  const response = await llm.invoke(prompt);
  const text = typeof response.content === "string"
    ? response.content
    : JSON.stringify(response.content);

  try {
    const extracted = extractJsons(text);
    if (extracted.length > 0 && "score" in extracted[extracted.length - 1]) {
      const score = Number(extracted[extracted.length - 1].score);
      return Math.max(0, Math.min(1, score));
    }
  } catch {
    // fallback
  }

  return 0;
}

/**
 * Human feedback evaluator: returns a score from user-provided feedback.
 * Use when collecting ratings from real users.
 *
 * This is a simple wrapper -- in production you'd connect this
 * to your feedback collection system (database, API, etc.).
 */
export function humanFeedbackEvaluator(
  feedbackScore: number
): number {
  return Math.max(0, Math.min(1, feedbackScore));
}

export type EvaluatorType = "static" | "llm_judge" | "human";
