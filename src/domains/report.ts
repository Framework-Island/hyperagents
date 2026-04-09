import * as fs from "fs";
import * as path from "path";
import type { EvalResult, ReportSummary } from "./base";

export interface ReportOptions {
  domain: string;
  outputDir: string;
  results?: EvalResult[];
}

/**
 * Generate a score report from evaluation results.
 */
export function generateReport(options: ReportOptions): ReportSummary {
  const { domain, outputDir } = options;
  let results = options.results;

  if (!results) {
    const predictionsPath = path.join(outputDir, "predictions.json");
    if (!fs.existsSync(predictionsPath)) {
      throw new Error(`No predictions found at ${predictionsPath}`);
    }
    results = JSON.parse(fs.readFileSync(predictionsPath, "utf-8")) as EvalResult[];
  }

  const totalTasks = results.length;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const averageScore = totalTasks > 0 ? totalScore / totalTasks : 0;

  const scores: Record<string, number> = {
    average: averageScore,
    total: totalScore,
    count: totalTasks,
  };

  const summary: ReportSummary = {
    domain,
    subset: path.basename(outputDir),
    totalTasks,
    averageScore,
    scores,
  };

  const reportPath = path.join(outputDir, "report.json");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  return summary;
}
