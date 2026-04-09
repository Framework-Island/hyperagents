import "dotenv/config";
import { TaskAgent } from "../../src/agent/task_agent";
import { MetaAgent } from "../../src/agent/meta_agent";
import { getFrameworkTools } from "../../src/tools";
import { BashDomain } from "./domain";
import { runHarness } from "../../src/domains/harness";
import { generateReport } from "../../src/domains/report";
import { runGenerateLoop, type GenerateLoopConfig } from "../../src/core/generate_loop";
import { ensureDir } from "../../src/utils/common";

async function runSingleEval() {
  console.log("=== HyperAgents Bash Example: Single Evaluation ===\n");

  const model = process.env.HYPERAGENTS_MODEL ?? "openai/gpt-4o";

  // TaskAgent gets framework tools so it can execute bash commands
  const taskAgent = new TaskAgent({ model, tools: getFrameworkTools() });
  const domain = new BashDomain();

  const outputDir = "./outputs/bash_eval";
  ensureDir(outputDir);

  const result = await runHarness({
    domain,
    agent: taskAgent,
    subset: "train",
    numSamples: 3,
    outputDir,
  });

  const report = generateReport({
    domain: "bash",
    outputDir,
    results: result.results,
  });

  console.log("\n=== Results ===");
  console.log(`Tasks: ${report.totalTasks}`);
  console.log(`Average Score: ${report.averageScore.toFixed(2)}`);
  console.log(`Scores: ${JSON.stringify(report.scores)}`);
}

async function runEvolutionaryLoop() {
  console.log("=== HyperAgents Bash Example: Evolutionary Self-Improvement ===\n");

  const model = process.env.HYPERAGENTS_MODEL ?? "anthropic/claude-sonnet-4-5-20250929";
  const tools = getFrameworkTools();

  // MetaAgent auto-loads framework tools even without passing them,
  // but we pass them here explicitly for the TaskAgent factory too.
  const metaAgent = new MetaAgent({ model });
  const domain = new BashDomain();

  const config: GenerateLoopConfig = {
    domains: [domain],
    metaAgent,
    taskAgentFactory: (t) => new TaskAgent({ model, tools: t }),
    tools,
    outputDir: "./outputs/bash_evolution",
    repoPath: ".",
    maxGenerations: 3,
    executionMode: "local",
    parentSelection: "score_child_prop",
    evalSamples: 5,
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
