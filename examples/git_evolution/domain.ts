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
  stagedEvalSamples: 4,
  scoreKey: "accuracy",
};

export class ScoringDomain implements Domain {
  config = CONFIG;
  private repoDir: string;

  constructor(private tasksPath: string) {
    this.repoDir = path.dirname(tasksPath);
  }

  async loadTasks(_subset: string, numSamples?: number): Promise<DomainTask[]> {
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

    return numSamples && numSamples > 0 ? tasks.slice(0, numSamples) : tasks;
  }

  async evaluate(prediction: string, task: DomainTask): Promise<number> {
    const expected = (task.groundTruth ?? "").toLowerCase().trim();
    const pred = prediction.toLowerCase().trim();
    return pred === expected ? 1.0 : 0.0;
  }

  getPrompt(): string {
    const promptPath = path.join(this.repoDir, "prompt.txt");
    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, "utf-8");
    }
    return "Grade the answer. Respond with JSON: { \"response\": \"accept\" } or { \"response\": \"reject\" }";
  }

  formatInput(task: DomainTask): string {
    const prompt = this.getPrompt();
    return `${prompt}

Question: ${task.inputs.question}
Expected answer: ${task.inputs.expected_answer}
Student answer: ${task.inputs.student_answer}

Respond with JSON: { "response": "accept" } or { "response": "reject" }`;
  }

  async report(results: EvalResult[]): Promise<ReportSummary> {
    const total = results.length;
    const correct = results.filter((r) => r.score === 1.0).length;
    return {
      domain: "scoring",
      subset: "train",
      totalTasks: total,
      averageScore: total > 0 ? correct / total : 0,
      scores: { accuracy: total > 0 ? correct / total : 0, correct, total },
    };
  }
}
