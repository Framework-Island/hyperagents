import * as fs from "fs";
import * as path from "path";
import type {
  Domain,
  DomainConfig,
  DomainTask,
  EvalResult,
  ReportSummary,
} from "../../src/domains/base";

const CONFIG: DomainConfig = {
  name: "factcheck",
  evalSubsets: ["train"],
  splits: ["train"],
  stagedEvalSamples: 5,
  scoreKey: "accuracy",
};

export class FactCheckDomain implements Domain {
  config = CONFIG;
  private tasksPath: string;

  constructor(tasksPath?: string) {
    this.tasksPath =
      tasksPath ??
      path.join(
        path.dirname(new URL(import.meta.url).pathname),
        "tasks.json"
      );
  }

  async loadTasks(
    subset: string,
    numSamples?: number
  ): Promise<DomainTask[]> {
    const raw = JSON.parse(
      fs.readFileSync(this.tasksPath, "utf-8")
    ) as Array<{
      id: string;
      statement: string;
      category: string;
      answer: string;
      explanation: string;
    }>;

    const tasks: DomainTask[] = raw.map((t) => ({
      questionId: t.id,
      domain: "factcheck",
      inputs: {
        statement: t.statement,
        category: t.category,
      },
      groundTruth: t.answer,
    }));

    if (numSamples && numSamples > 0) {
      return tasks.slice(0, numSamples);
    }
    return tasks;
  }

  async evaluate(prediction: string, task: DomainTask): Promise<number> {
    const expected = (task.groundTruth ?? "").toLowerCase().trim();
    const pred = prediction.toLowerCase().trim();
    return pred === expected ? 1.0 : 0.0;
  }

  formatInput(task: DomainTask): string {
    return `Determine if the following statement is factually true or false.

Statement: ${task.inputs.statement}
Category: ${task.inputs.category}

Respond in JSON format: { "response": "true" } or { "response": "false" }`;
  }

  async report(results: EvalResult[]): Promise<ReportSummary> {
    const total = results.length;
    const correct = results.filter((r) => r.score === 1.0).length;
    const accuracy = total > 0 ? correct / total : 0;

    return {
      domain: "factcheck",
      subset: "train",
      totalTasks: total,
      averageScore: accuracy,
      scores: { accuracy, correct, total },
    };
  }
}
