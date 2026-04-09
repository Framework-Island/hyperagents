import "dotenv/config";
import { TaskAgent } from "../../src/agent/task_agent";
import { PaperReviewDomain } from "./domain";
import { runHarness } from "../../src/domains/harness";
import { generateReport } from "../../src/domains/report";
import { ensureDir } from "../../src/utils/common";

async function main() {
  console.log("=== HyperAgents Paper Review Example ===\n");

  const model = process.env.HYPERAGENTS_MODEL ?? "anthropic/claude-sonnet-4-5-20250929";

  const taskAgent = new TaskAgent({ model });
  const domain = new PaperReviewDomain();

  const outputDir = "./outputs/paper_review_eval";
  ensureDir(outputDir);

  console.log(`Model: ${model}`);
  console.log(`Loading tasks...\n`);

  const result = await runHarness({
    domain,
    agent: taskAgent,
    subset: "train",
    numSamples: 4,
    outputDir,
  });

  const report = generateReport({
    domain: "paper_review",
    outputDir,
    results: result.results,
  });

  console.log("\n=== Results ===");
  console.log(`Tasks evaluated: ${report.totalTasks}`);
  console.log(`Average Score: ${report.averageScore.toFixed(2)}`);

  for (const r of result.results) {
    const icon = r.score === 1.0 ? "OK" : r.score === 0.5 ? "PARTIAL" : "MISS";
    console.log(`  [${icon}] ${r.questionId}: predicted="${r.prediction}"`);
  }
}

main().catch(console.error);
