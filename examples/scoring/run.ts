import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createLLM } from "../../src/agent/llm";
import { chatWithAgent } from "../../src/agent/llm_with_tools";
import { MetaAgent } from "../../src/agent/meta_agent";
import { extractJsons } from "../../src/utils/common";
import { ensureDir } from "../../src/utils/common";

const EXAMPLE_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const PROMPT_FILE = path.join(EXAMPLE_DIR, "prompt.txt");
const EVAL_DIR = path.resolve("./outputs/scoring_eval");

interface Task {
  id: string;
  question: string;
  student_answer: string;
  expected_answer: string;
  correct: boolean;
}

const INITIAL_PROMPT = `Compare the student's answer to the expected answer.
If the two strings are EXACTLY identical character-by-character, respond "accept".
If they differ in ANY way -- extra spaces, trailing zeros, fractions vs decimals -- respond "reject".
Do NOT interpret mathematical equivalence. Only do raw string comparison.`;

function getPrompt(): string {
  if (fs.existsSync(PROMPT_FILE)) {
    return fs.readFileSync(PROMPT_FILE, "utf-8");
  }
  return INITIAL_PROMPT;
}

function loadTasks(): Task[] {
  return JSON.parse(fs.readFileSync(path.join(EXAMPLE_DIR, "tasks.json"), "utf-8"));
}

async function evaluate(generation: number): Promise<{ score: number; details: string[] }> {
  const model = process.env.HYPERAGENTS_MODEL ?? "anthropic/claude-sonnet-4-5-20250929";
  const llm = createLLM({ model, temperature: 0 });
  const systemPrompt = getPrompt();

  console.log(`\n--- Generation ${generation} ---`);
  console.log(`Prompt (from ${fs.existsSync(PROMPT_FILE) ? "prompt.txt" : "INITIAL_PROMPT in run.ts"}):`);
  console.log(systemPrompt.split("\n").map(l => "  | " + l).join("\n") + "\n");

  const tasks = loadTasks();
  const details: string[] = [];
  let correct = 0;

  for (const task of tasks) {
    const userMessage = `Question: ${task.question}
Expected answer: ${task.expected_answer}
Student answer: ${task.student_answer}

Is the student's answer correct? Respond ONLY with JSON: { "response": "accept" } or { "response": "reject" }`;

    const { response } = await chatWithAgent(userMessage, {
      llm,
      tools: [],
      systemPrompt,
      log: () => {},
    });

    let prediction = "unknown";
    try {
      const extracted = extractJsons(response);
      if (extracted.length > 0 && "response" in extracted[extracted.length - 1]) {
        prediction = String(extracted[extracted.length - 1].response).toLowerCase().trim();
      }
    } catch {
      prediction = response.toLowerCase().includes("accept") ? "accept" : "reject";
    }

    const truth = task.correct ? "accept" : "reject";
    const isCorrect = prediction === truth;
    if (isCorrect) correct++;

    const icon = isCorrect ? "PASS" : "FAIL";
    const line = `  [${icon}] ${task.id}: student="${task.student_answer}" expected="${task.expected_answer}" -> predicted="${prediction}" (truth: ${truth})`;
    details.push(line);
    console.log(line);
  }

  const score = correct / tasks.length;
  console.log(`\n  Score: ${score.toFixed(2)} (${correct}/${tasks.length})\n`);

  const evalDir = path.join(EVAL_DIR, `gen_${generation}`);
  ensureDir(evalDir);
  fs.writeFileSync(
    path.join(evalDir, "results.txt"),
    [
      `Generation ${generation} Results: ${score.toFixed(2)} (${correct}/${tasks.length})`,
      ``,
      `System prompt used:`,
      systemPrompt,
      ``,
      `All results:`,
      ...details,
      ``,
      `FAILURES that need fixing:`,
      ...details.filter(d => d.includes("[FAIL]")),
      ``,
      `The prompt file is at: ${PROMPT_FILE}`,
      `The example source code is at: ${EXAMPLE_DIR}`,
      `You can edit prompt.txt, run.ts, domain.ts, or tasks.json to improve performance.`,
    ].join("\n")
  );

  return { score, details };
}

async function improve() {
  const model = process.env.HYPERAGENTS_MODEL ?? "openai/gpt-4o";

  console.log("=== MetaAgent analyzing failures and improving the code ===\n");

  // If no prompt.txt exists yet, write the initial one so MetaAgent can edit it
  if (!fs.existsSync(PROMPT_FILE)) {
    fs.writeFileSync(PROMPT_FILE, INITIAL_PROMPT);
  }

  // Copy eval results into the example dir so MetaAgent can find them
  const evalResultsTarget = path.join(EXAMPLE_DIR, "eval_results");
  ensureDir(evalResultsTarget);
  if (fs.existsSync(EVAL_DIR)) {
    fs.cpSync(EVAL_DIR, evalResultsTarget, { recursive: true });
  }

  const metaAgent = new MetaAgent({ model });

  // Point MetaAgent at the REAL source directory -- it will edit actual files
  await metaAgent.forward({
    repoPath: EXAMPLE_DIR,
    evalPath: EXAMPLE_DIR,
    iterationsLeft: 1,
  });

  // Clean up copied eval results
  fs.rmSync(evalResultsTarget, { recursive: true, force: true });

  console.log("\nMetaAgent finished editing.\n");

  const newPrompt = getPrompt();
  console.log("Current prompt after edit:");
  console.log(newPrompt.split("\n").map(l => "  | " + l).join("\n") + "\n");
}

function getGenerationCount(): number {
  if (!fs.existsSync(EVAL_DIR)) return 0;
  const dirs = fs.readdirSync(EVAL_DIR).filter(d => d.startsWith("gen_"));
  return dirs.length;
}

async function main() {
  const forceReset = process.argv.includes("--reset");

  if (forceReset) {
    // Reset prompt.txt back to the weak version
    fs.writeFileSync(PROMPT_FILE, INITIAL_PROMPT);
    fs.rmSync(EVAL_DIR, { recursive: true, force: true });
    console.log("Reset to initial weak prompt.\n");
  }

  const genStart = getGenerationCount();

  console.log("=== HyperAgents: Self-Improvement Demo (Math Grading) ===");
  console.log("The MetaAgent edits real source files to improve the agent.");
  if (genStart === 0) {
    console.log("Starting fresh with a weak prompt (strict string comparison).");
  } else {
    console.log(`Continuing from generation ${genStart} (run --reset to start over).`);
  }
  console.log();

  const before = await evaluate(genStart);

  await improve();

  const after = await evaluate(genStart + 1);

  console.log("\n========================================");
  console.log("           RESULTS SUMMARY");
  console.log("========================================");
  console.log(`  Generation ${genStart}:     ${before.score.toFixed(2)}`);
  console.log(`  Generation ${genStart + 1}:     ${after.score.toFixed(2)}`);
  const delta = after.score - before.score;
  if (delta > 0) {
    console.log(`  Improvement:      +${(delta * 100).toFixed(0)}%`);
  } else if (delta === 0) {
    console.log(`  No change`);
  } else {
    console.log(`  Regression:       ${(delta * 100).toFixed(0)}%`);
  }
  console.log("========================================");
  console.log(`\nFiles the MetaAgent can edit:`);
  console.log(`  ${PROMPT_FILE}  (the grading prompt)`);
  console.log(`  ${path.join(EXAMPLE_DIR, "run.ts")}  (this script)`);
  console.log(`  ${path.join(EXAMPLE_DIR, "domain.ts")}  (evaluation logic)`);
  console.log(`  ${path.join(EXAMPLE_DIR, "tasks.json")}  (task definitions)`);
  console.log(`\nRun again to keep improving. Use --reset to start over.\n`);
}

main().catch(console.error);
