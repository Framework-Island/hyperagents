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
  name: "paper_review",
  evalSubsets: ["train"],
  splits: ["train"],
  stagedEvalSamples: 5,
  scoreKey: "accuracy",
};

export class PaperReviewDomain implements Domain {
  config = CONFIG;
  private tasksPath: string;

  constructor(tasksPath?: string) {
    this.tasksPath = tasksPath ?? path.join(path.dirname(new URL(import.meta.url).pathname), "tasks.json");
  }

  async loadTasks(subset: string, numSamples?: number): Promise<DomainTask[]> {
    const raw = JSON.parse(fs.readFileSync(this.tasksPath, "utf-8")) as Array<{
      id: string;
      title: string;
      abstract: string;
      venue: string;
      decision: string;
    }>;

    const tasks: DomainTask[] = raw.map((t) => ({
      questionId: t.id,
      domain: "paper_review",
      inputs: {
        title: t.title,
        abstract: t.abstract,
        venue: t.venue,
      },
      groundTruth: t.decision,
    }));

    if (numSamples && numSamples > 0) {
      return tasks.slice(0, numSamples);
    }
    return tasks;
  }

  async evaluate(prediction: string, task: DomainTask): Promise<number> {
    const expected = (task.groundTruth ?? "").toLowerCase().trim();
    const pred = prediction.toLowerCase().trim();

    if (pred === expected) return 1.0;
    if (pred.includes(expected)) return 0.5;
    return 0.0;
  }

  formatInput(task: DomainTask): string {
    return `You are an expert paper reviewer for the ${task.inputs.venue} venue.

Review the following paper and predict whether it will be accepted or rejected.

Title: ${task.inputs.title}

Abstract: ${task.inputs.abstract}

Based on the quality, novelty, and significance of this work, predict the decision.
Respond in JSON format: { "response": "accept" } or { "response": "reject" }`;
  }

  async report(results: EvalResult[]): Promise<ReportSummary> {
    const total = results.length;
    const correct = results.filter((r) => r.score === 1.0).length;
    const partial = results.filter((r) => r.score === 0.5).length;
    const totalScore = results.reduce((s, r) => s + r.score, 0);
    const accuracy = total > 0 ? totalScore / total : 0;

    return {
      domain: "paper_review",
      subset: "train",
      totalTasks: total,
      averageScore: accuracy,
      scores: { accuracy, correct, partial, total },
    };
  }
}
