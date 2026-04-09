import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createLLM } from "../../src/agent/llm";
import { chatWithAgent } from "../../src/agent/llm_with_tools";
import { MetaAgent } from "../../src/agent/meta_agent";
import { extractJsons } from "../../src/utils/common";
import { ensureDir } from "../../src/utils/common";

const EXAMPLE_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const TOOL_FILE = path.join(EXAMPLE_DIR, "calc_tool.ts");
const TOOL_BACKUP = path.join(EXAMPLE_DIR, "calc_tool.original.ts");
const EVAL_DIR = path.resolve("./outputs/calculator_eval");

interface Task {
  id: string;
  description: string;
  expected: string;
}

function loadTasks(): Task[] {
  return JSON.parse(fs.readFileSync(path.join(EXAMPLE_DIR, "tasks.json"), "utf-8"));
}

function resetTool() {
  fs.copyFileSync(TOOL_BACKUP, TOOL_FILE);
}

async function evaluate(generation: number): Promise<{ score: number; details: string[] }> {
  const model = process.env.HYPERAGENTS_MODEL ?? "openai/gpt-4o";
  const llm = createLLM({ model, temperature: 0 });

  const toolModule = await import(`${TOOL_FILE}?gen=${generation}&t=${Date.now()}`);
  const calcTool = toolModule.createCalcTool();

  console.log(`\n--- Generation ${generation} ---`);

  const tasks = loadTasks();
  const details: string[] = [];
  let correct = 0;

  for (const task of tasks) {
    const userMessage = `You MUST use the calculator tool for this math problem. Do NOT compute the answer yourself.
Call the calculator tool, then return exactly what it gives you.

Problem: ${task.description}

Respond with ONLY JSON: { "response": "<the number the calculator returned>" }`;

    const { response } = await chatWithAgent(userMessage, {
      llm,
      tools: [calcTool],
      log: () => {},
    });

    let prediction = "error";
    try {
      const extracted = extractJsons(response);
      if (extracted.length > 0 && "response" in extracted[extracted.length - 1]) {
        prediction = String(extracted[extracted.length - 1].response).trim();
      }
    } catch {
      const numMatch = response.match(/-?\d+\.?\d*/);
      if (numMatch) prediction = numMatch[0];
    }

    const isCorrect = prediction === task.expected ||
      parseFloat(prediction) === parseFloat(task.expected);
    if (isCorrect) correct++;

    const icon = isCorrect ? "PASS" : "FAIL";
    const line = `  [${icon}] ${task.id}: "${task.description}" -> ${prediction} (expected: ${task.expected})`;
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
      `Calculator tool source code (${TOOL_FILE}):`,
      fs.readFileSync(TOOL_FILE, "utf-8"),
      ``,
      `All results:`,
      ...details,
      ``,
      `FAILURES -- the calculator tool returned wrong answers for these:`,
      ...details.filter(d => d.includes("[FAIL]")),
      ``,
      `FIX THE BUGS in ${TOOL_FILE}. The evaluateExpression function has bugs:`,
      `- Subtraction returns Math.abs() instead of allowing negatives`,
      `- Multiplication returns a+b instead of a*b when numbers > 10`,
      `- Division uses Math.floor() which truncates decimals`,
      `Edit the function to fix these bugs.`,
    ].join("\n")
  );

  return { score, details };
}

async function improve() {
  const model = process.env.HYPERAGENTS_MODEL ?? "openai/gpt-4o";

  console.log("=== MetaAgent analyzing failures and fixing the tool ===\n");

  const evalResultsTarget = path.join(EXAMPLE_DIR, "eval_results");
  ensureDir(evalResultsTarget);
  if (fs.existsSync(EVAL_DIR)) {
    fs.cpSync(EVAL_DIR, evalResultsTarget, { recursive: true });
  }

  const metaAgent = new MetaAgent({ model });

  await metaAgent.forward({
    repoPath: EXAMPLE_DIR,
    evalPath: EXAMPLE_DIR,
    iterationsLeft: 1,
  });

  fs.rmSync(evalResultsTarget, { recursive: true, force: true });

  console.log("\nMetaAgent finished editing.\n");
  console.log("Updated tool code:");
  const code = fs.readFileSync(TOOL_FILE, "utf-8");
  console.log(code.split("\n").map(l => "  " + l).join("\n"));
}

function getGenerationCount(): number {
  if (!fs.existsSync(EVAL_DIR)) return 0;
  return fs.readdirSync(EVAL_DIR).filter(d => d.startsWith("gen_")).length;
}

async function main() {
  const forceReset = process.argv.includes("--reset");

  if (forceReset) {
    fs.rmSync(EVAL_DIR, { recursive: true, force: true });
    resetTool();
    console.log("Reset to original buggy calculator tool.\n");
  }

  const genStart = getGenerationCount();

  console.log("=== HyperAgents: Tool Improvement Demo (Calculator) ===");
  console.log("The TaskAgent has a BUGGY calculator tool (wrong answers!).");
  console.log("The MetaAgent will edit calc_tool.ts to fix the bugs.");
  if (genStart > 0) {
    console.log(`Continuing from generation ${genStart} (run --reset to start over).`);
  }

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
  console.log(`\nTool source: ${TOOL_FILE}`);
  console.log("Run again to keep improving. Use --reset to start over.\n");
}

main().catch(console.error);
