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
  name: "scoring",
  evalSubsets: ["train"],
  splits: ["train"],
  stagedEvalSamples: 6,
  scoreKey: "accuracy",
};

export class ScoringDomain implements Domain {
  config = CONFIG;
  private tasksPath: string;

  constructor(tasksPath?: string) {
    this.tasksPath = tasksPath ?? path.join(path.dirname(new URL(import.meta.url).pathname), "tasks.json");
  }

  async loadTasks(subset: string, numSamples?: number): Promise<DomainTask[]> {
    const raw = JSON.parse(fs.readFileSync(this.tasksPath, "utf-8")) as Array<{
      id: string;
      question: string;
      student_answer: string;
      expected_answer: string;
      correct: boolean;
    }>;

    const tasks: DomainTask[] = raw.map((t) => ({
      questionId: t.id,
      domain: "scoring",
      inputs: {
        question: t.question,
        student_answer: t.student_answer,
        expected_answer: t.expected_answer,
      },
      groundTruth: t.correct ? "accept" : "reject",
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
    return `Grade the following student answer.

Question: ${task.inputs.question}
Expected answer: ${task.inputs.expected_answer}
Student answer: ${task.inputs.student_answer}

Respond in JSON format: { "response": "accept" } if correct, { "response": "reject" } if wrong.`;
  }

  async report(results: EvalResult[]): Promise<ReportSummary> {
    const total = results.length;
    const correct = results.filter((r) => r.score === 1.0).length;
    const accuracy = total > 0 ? correct / total : 0;

    return {
      domain: "scoring",
      subset: "train",
      totalTasks: total,
      averageScore: accuracy,
      scores: { accuracy, correct, total },
    };
  }
}
