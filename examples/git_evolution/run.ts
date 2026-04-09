import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { MetaAgent } from "../../src/agent/meta_agent";
import { TaskAgent } from "../../src/agent/task_agent";
import { getFrameworkTools } from "../../src/tools";
import { runGenerateLoop, type GenerateLoopConfig } from "../../src/core/generate_loop";
import { ensureDir } from "../../src/utils/common";
import { ScoringDomain } from "./domain";

/**
 * Git-based evolution demo using the framework's own runGenerateLoop().
 *
 * This sets up a mini git repo, then runs the full evolutionary loop:
 *   - LocalExecutor copies repo to /tmp/ (originals safe)
 *   - MetaAgent edits files in /tmp/
 *   - git diff captures changes as .diff patches
 *   - Patches saved in archive
 *   - Next generation applies ancestor patches on fresh copy
 *
 * Your source files are NEVER modified.
 */

const OUTPUT_DIR = path.resolve("./outputs/git_evolution");
const REPO_DIR = path.join(OUTPUT_DIR, "repo");

const WEAK_PROMPT = `Compare the student answer to the expected answer.
If the strings are EXACTLY identical character by character, respond "accept".
Otherwise respond "reject". Do NOT interpret mathematical equivalence.`;

function setupRepo() {
  if (fs.existsSync(path.join(REPO_DIR, ".git"))) {
    console.log(`Using existing repo at: ${REPO_DIR}\n`);
    return;
  }

  ensureDir(REPO_DIR);
  execSync("git init", { cwd: REPO_DIR, stdio: "pipe" });
  execSync("git config user.email 'demo@hyperagents'", { cwd: REPO_DIR, stdio: "pipe" });
  execSync("git config user.name 'HyperAgents Demo'", { cwd: REPO_DIR, stdio: "pipe" });

  fs.writeFileSync(path.join(REPO_DIR, "prompt.txt"), WEAK_PROMPT);

  const tasksPath = path.join(path.dirname(new URL(import.meta.url).pathname), "tasks.json");
  fs.copyFileSync(tasksPath, path.join(REPO_DIR, "tasks.json"));

  execSync("git add -A && git commit -m 'initial: weak grading prompt'", { cwd: REPO_DIR, stdio: "pipe" });

  const commit = execSync("git rev-parse HEAD", { cwd: REPO_DIR, encoding: "utf-8" }).trim();
  console.log(`Git repo initialized at: ${REPO_DIR}`);
  console.log(`Base commit: ${commit}\n`);
}

async function main() {
  const forceReset = process.argv.includes("--reset");

  if (forceReset) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    console.log("Reset: cleaned everything.\n");
  }

  console.log("=== HyperAgents: Git-Based Evolution Demo ===");
  console.log("Uses runGenerateLoop() + LocalExecutor + git diff.");
  console.log("Edits happen in /tmp/. Originals never touched.");
  console.log("Patches saved as .diff files in the archive.\n");

  setupRepo();

  const model = process.env.HYPERAGENTS_MODEL ?? "openai/gpt-4o";
  const generations = parseInt(process.argv.find(a => /^\d+$/.test(a)) ?? "2");

  const baseCommit = execSync("git rev-parse HEAD", { cwd: REPO_DIR, encoding: "utf-8" }).trim();

  const config: GenerateLoopConfig = {
    domains: [new ScoringDomain(path.join(REPO_DIR, "tasks.json"))],
    domainFactory: (workdir) => [new ScoringDomain(path.join(workdir, "tasks.json"))],
    metaAgent: new MetaAgent({ model }),
    taskAgentFactory: (tools) => new TaskAgent({ model, tools }),
    tools: getFrameworkTools(),
    outputDir: OUTPUT_DIR,
    repoPath: REPO_DIR,
    maxGenerations: generations,
    executionMode: "local",
    parentSelection: "best",
    baseCommit,
    skipStagedEval: true,
  };

  const outputDir = await runGenerateLoop(config);

  console.log(`\nOriginal repo untouched:`);
  const originalPrompt = fs.readFileSync(path.join(REPO_DIR, "prompt.txt"), "utf-8");
  console.log(`  "${originalPrompt.split("\n")[0]}..."\n`);

  const patchDir = path.join(OUTPUT_DIR);
  const genDirs = fs.readdirSync(patchDir).filter(d => d.startsWith("gen_")).sort();
  console.log(`Archive contents:`);
  for (const genDir of genDirs) {
    const patchPath = path.join(patchDir, genDir, "agent_output", "model_patch.diff");
    const has = fs.existsSync(patchPath);
    console.log(`  ${genDir}: ${has ? `patch (${fs.statSync(patchPath).size} bytes)` : "no patch"}`);
  }
  console.log(`\nRun again to add more generations. Use --reset to start over.`);
}

main().catch(console.error);
