export interface DomainTask {
  questionId: string;
  domain: string;
  inputs: Record<string, unknown>;
  groundTruth?: string;
}

export interface DomainConfig {
  name: string;
  evalSubsets: string[];
  splits: string[];
  stagedEvalSamples: number;
  scoreKey: string;
}

export interface EvalResult {
  questionId: string;
  prediction: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface ReportSummary {
  domain: string;
  subset: string;
  totalTasks: number;
  averageScore: number;
  scores: Record<string, number>;
}

/**
 * Domain interface -- the contract every evaluation domain must implement.
 *
 * Each example (bash, paper_review, etc.) provides its own Domain class
 * that knows how to load tasks, format inputs, evaluate predictions,
 * and generate reports.
 */
export interface Domain {
  config: DomainConfig;

  loadTasks(subset: string, numSamples?: number): Promise<DomainTask[]>;

  evaluate(prediction: string, task: DomainTask): Promise<number>;

  formatInput(task: DomainTask): string;

  report(results: EvalResult[]): Promise<ReportSummary>;
}
