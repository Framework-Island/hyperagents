import type { Domain, DomainTask, EvalResult } from "./base";
import type { TaskAgent } from "../agent/task_agent";

export interface HarnessOptions {
  domain: Domain;
  agent: TaskAgent;
  subset: string;
  numSamples?: number;
  numWorkers?: number;
  outputDir: string;
}

export interface HarnessResult {
  results: EvalResult[];
  score: number;
}

/**
 * Generic evaluation harness -- runs a TaskAgent against a Domain's tasks
 * and collects predictions + scores.
 */
export async function runHarness(options: HarnessOptions): Promise<HarnessResult> {
  const { domain, agent, subset, numSamples = -1, numWorkers = 1, outputDir } = options;

  const tasks = await domain.loadTasks(subset, numSamples > 0 ? numSamples : undefined);
  const results: EvalResult[] = [];

  const processTask = async (task: DomainTask): Promise<EvalResult> => {
    const formattedInput = domain.formatInput(task);

    const { prediction } = await agent.forward({
      domain: domain.config.name,
      ...task.inputs,
      formattedInput,
    });

    const score = await domain.evaluate(prediction, task);

    return {
      questionId: task.questionId,
      prediction,
      score,
    };
  };

  if (numWorkers <= 1) {
    for (const task of tasks) {
      const result = await processTask(task);
      results.push(result);
    }
  } else {
    const chunks: DomainTask[][] = [];
    for (let i = 0; i < tasks.length; i += numWorkers) {
      chunks.push(tasks.slice(i, i + numWorkers));
    }
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(processTask));
      results.push(...chunkResults);
    }
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const averageScore = results.length > 0 ? totalScore / results.length : 0;

  const fs = await import("fs");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    `${outputDir}/predictions.json`,
    JSON.stringify(results, null, 2)
  );

  return { results, score: averageScore };
}
