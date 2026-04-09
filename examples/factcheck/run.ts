import "dotenv/config";
import { TaskAgent } from "../../src/agent/task_agent";
import { MetaAgent } from "../../src/agent/meta_agent";
import { getFrameworkTools } from "../../src/tools";
import { FactCheckDomain } from "./domain";
import { runHarness } from "../../src/domains/harness";
import { generateReport } from "../../src/domains/report";
import { runGenerateLoop, type GenerateLoopConfig } from "../../src/core/generate_loop";
import { ensureDir } from "../../src/utils/common";

/**
 * Mode 1: Single evaluation -- run the TaskAgent on fact-check tasks once
 * and print the score. No evolution, no archive, just "how good is it now?"
 */
async function runSingleEval() {
  console.log("=== HyperAgents Fact-Check Example: Single Evaluation ===\n");

  const model = process.env.HYPERAGENTS_MODEL ?? "anthropic/claude-sonnet-4-5-20250929";
  const taskAgent = new TaskAgent({ model, tools: getFrameworkTools() });
  const domain = new FactCheckDomain();

  const outputDir = "./outputs/factcheck_eval";
  ensureDir(outputDir);

  const result = await runHarness({
    domain,
    agent: taskAgent,
    subset: "train",
    numSamples: 5,
    outputDir,
  });

  const report = generateReport({
    domain: "factcheck",
    outputDir,
    results: result.results,
  });

  console.log("\n=== Results ===");
  console.log(`Tasks: ${report.totalTasks}`);
  console.log(`Average Score: ${report.averageScore.toFixed(2)}`);
  console.log(`Scores: ${JSON.stringify(report.scores)}`);

  console.log("\n=== Per-task breakdown ===");
  for (const r of result.results) {
    const icon = r.score === 1.0 ? "PASS" : "FAIL";
    console.log(`  [${icon}] ${r.questionId}: predicted="${r.prediction}"`);
  }
}

/**
 * Mode 2: Evolutionary self-improvement loop -- uses runGenerateLoop
 * with the archive, parent selection, MetaAgent, and harness evaluation.
 *
 * Each generation:
 *   1. Picks the best parent from the archive
 *   2. MetaAgent analyses failures and edits the code/prompts
 *   3. Harness evaluates the modified agent on fact-check tasks
 *   4. Scores are recorded in the archive
 *   5. Repeat for N generations
 */
async function runEvolutionaryLoop() {
  console.log("=== HyperAgents Fact-Check Example: Evolutionary Self-Improvement ===\n");

  const model = process.env.HYPERAGENTS_MODEL ?? "openai/gpt-4o";
  const tools = getFrameworkTools();
  const metaAgent = new MetaAgent({ model });
  const domain = new FactCheckDomain();

  const config: GenerateLoopConfig = {
    domains: [domain],
    metaAgent,
    taskAgentFactory: (t) => new TaskAgent({ model, tools: t }),
    tools,
    outputDir: "./outputs/factcheck_evolution",
    repoPath: ".",
    maxGenerations: 3,
    executionMode: "local",
    parentSelection: "score_child_prop",
    evalSamples: 10,
  };

  const outputDir = await runGenerateLoop(config);
  console.log(`\nEvolution complete. Results at: ${outputDir}`);
}

const mode = process.argv[2] ?? "eval";

if (mode === "evolve") {
  runEvolutionaryLoop().catch(console.error);
} else {
  runSingleEval().catch(console.error);
}
