import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import type {
  Domain,
  DomainConfig,
  DomainTask,
  EvalResult,
  ReportSummary,
} from "../../src/domains/base";

const CONFIG: DomainConfig = {
  name: "bash",
  evalSubsets: ["train"],
  splits: ["train"],
  stagedEvalSamples: 5,
  scoreKey: "accuracy",
};

export class BashDomain implements Domain {
  config = CONFIG;
  private tasksPath: string;

  constructor(tasksPath?: string) {
    this.tasksPath = tasksPath ?? path.join(path.dirname(new URL(import.meta.url).pathname), "tasks.json");
  }

  async loadTasks(subset: string, numSamples?: number): Promise<DomainTask[]> {
    const raw = JSON.parse(fs.readFileSync(this.tasksPath, "utf-8")) as Array<{
      id: string;
      description: string;
      expected_output: string;
      hint?: string;
    }>;

    const tasks: DomainTask[] = raw.map((t) => ({
      questionId: t.id,
      domain: "bash",
      inputs: {
        description: t.description,
        hint: t.hint ?? "",
      },
      groundTruth: t.expected_output,
    }));

    if (numSamples && numSamples > 0) {
      return tasks.slice(0, numSamples);
    }
    return tasks;
  }

  async evaluate(prediction: string, task: DomainTask): Promise<number> {
    try {
      const output = execSync(prediction, {
        encoding: "utf-8",
        timeout: 30_000,
        shell: "/bin/bash",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      const expected = (task.groundTruth ?? "").trim();
      return output === expected ? 1.0 : 0.0;
    } catch {
      return 0.0;
    }
  }

  formatInput(task: DomainTask): string {
    const desc = task.inputs.description as string;
    const hint = task.inputs.hint as string;
    return `Write a bash one-liner or short script that does the following:

${desc}
${hint ? `\nHint: ${hint}` : ""}

Your response must be valid bash that can be executed directly.
Respond in JSON format: { "response": "<your bash command>" }`;
  }

  async report(results: EvalResult[]): Promise<ReportSummary> {
    const total = results.length;
    const correct = results.filter((r) => r.score === 1.0).length;
    const accuracy = total > 0 ? correct / total : 0;

    return {
      domain: "bash",
      subset: "train",
      totalTasks: total,
      averageScore: accuracy,
      scores: { accuracy, correct, total },
    };
  }
}
