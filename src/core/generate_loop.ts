import * as fs from "fs";
import * as path from "path";
import type { StructuredTool } from "@langchain/core/tools";
import type { Domain } from "../domains/base";
import type { MetaAgent } from "../agent/meta_agent";
import type { TaskAgent } from "../agent/task_agent";
import { runHarness } from "../domains/harness";
import { generateReport } from "../domains/report";
import { selectParent, type SelectionStrategy } from "./select_parent";
import {
  loadArchive,
  updateArchive,
  saveGenMetadata,
  getPatchFiles,
  getScore,
  isStartingNode,
  type ArchiveData,
  type ArchiveEntry,
} from "../utils/archive";
import { createExecutor, type Executor } from "../utils/executor";
import { ensureDir } from "../utils/common";
import { PATCH_FILENAME } from "../utils/constants";
import { META_AGENT_PROMPT_TEMPLATE } from "../prompts/meta_agent";
import { TASK_AGENT_PROMPT_TEMPLATE } from "../prompts/task_agent";

export interface GenerateLoopConfig {
  domains: Domain[];
  /** Optional: create fresh domain instances pointing at the executor's workdir after MetaAgent edits. */
  domainFactory?: (workdir: string) => Domain[];
  metaAgent: MetaAgent;
  taskAgentFactory: (tools: StructuredTool[]) => TaskAgent;
  tools: StructuredTool[];
  outputDir: string;
  repoPath: string;
  maxGenerations: number;
  executionMode: "local" | "docker";
  parentSelection: SelectionStrategy;
  evalSamples?: number;
  evalWorkers?: number;
  baseCommit?: string;
  imageName?: string;
  skipStagedEval?: boolean;
  /** Directory containing editable prompt files (meta_agent.txt, task_agent.txt).
   *  If set, prompts are read from these files at runtime, enabling the MetaAgent
   *  to modify its own prompt and the TaskAgent's prompt across generations. */
  promptsDir?: string;
}


/**
 * Run the full evolutionary self-improvement loop.
 *
 * This is the TypeScript + LangGraph port of HyperAgents' generate_loop.py.
 * Each generation:
 *   1. Select a parent from the archive
 *   2. Set up an executor (local or Docker)
 *   3. Apply lineage diffs
 *   4. Run the MetaAgent to produce code modifications
 *   5. Evaluate the produced agent (staged then full)
 *   6. Update the archive
 *   7. Repeat
 * 
 * @param config - The configuration for the generate loop.
 * @return {Promise<string>} The path to the output directory.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
export async function runGenerateLoop(config: GenerateLoopConfig): Promise<string> {
  // Destructure the configuration.
  const {
    domains,
    metaAgent,
    taskAgentFactory,
    tools,
    outputDir,
    repoPath,
    maxGenerations,
    executionMode,
    parentSelection,
    evalSamples = -1,
    evalWorkers = 1,
    baseCommit = "HEAD",
    skipStagedEval = false,
    promptsDir,
  } = config;

  // Ensure the output directory exists.
  ensureDir(outputDir);

  // Resolve prompt file paths (if promptsDir is configured).
  const metaPromptFile = promptsDir ? path.join(promptsDir, "meta_agent.txt") : undefined;
  const taskPromptFile = promptsDir ? path.join(promptsDir, "task_agent.txt") : undefined;

  // Scaffold default prompt files if promptsDir is set but files don't exist yet.
  if (promptsDir) {
    ensureDir(promptsDir);
    if (metaPromptFile && !fs.existsSync(metaPromptFile)) {
      fs.writeFileSync(metaPromptFile, META_AGENT_PROMPT_TEMPLATE);
      console.log(`Scaffolded editable prompt: ${metaPromptFile}`);
    }
    if (taskPromptFile && !fs.existsSync(taskPromptFile)) {
      fs.writeFileSync(taskPromptFile, TASK_AGENT_PROMPT_TEMPLATE);
      console.log(`Scaffolded editable prompt: ${taskPromptFile}`);
    }
  }
  // Get the names of the domains.
  const domainNames = domains.map((d) => d.config.name);

  // Load the archive data.
  let archive = loadArchive(outputDir);
  // If the archive is empty, create an initial entry.
  if (archive.archive.length === 0) {
    const initialEntry: ArchiveEntry = {
      genId: "initial",
      parentId: null,
      patchFiles: [],
      scores: {},
      metadata: { run_eval: true },
      validParent: true,
      timestamp: new Date().toISOString(),
    };
    // Update the archive with the initial entry.
    archive = updateArchive(outputDir, archive, initialEntry);
    // Ensure the initial generation directory exists.
    ensureDir(path.join(outputDir, "gen_initial"));
    // Save the initial generation metadata.
    saveGenMetadata(outputDir, "initial", {
      gen_output_dir: path.join(outputDir, "gen_initial"),
      prev_patch_files: [],
      curr_patch_files: [],
      run_eval: true,
    });
  }

  // Loop through the generations.
  for (let genId = archive.archive.length; genId <= maxGenerations; genId++) {
    // Early termination: check if the best score in the archive is perfect.
    const bestArchiveScore = getBestArchiveScore(archive, outputDir, domainNames);
    if (bestArchiveScore >= 1.0) {
      console.log(`\nPerfect score (${(bestArchiveScore * 100).toFixed(1)}%) achieved. Stopping early.`);
      break;
    }

    console.log(`\n=== Generation ${genId} ===`);

    // Select a parent generation.
    const parentId = selectParent(archive, outputDir, domainNames, parentSelection);
    // Log the selected parent generation.
    console.log(`Selected parent: ${parentId}`);

    // Create the generation directory.
    const genDir = path.join(outputDir, `gen_${genId}`);
    // Ensure the generation directory exists.
    ensureDir(genDir);

    // Create the executor.
    const executor = createExecutor(executionMode, {
      repoPath,
      baseCommit,
      imageName: config.imageName,
      containerName: `hyperagents-gen-${genId}-${Date.now()}`,
    });

    // Get the previous patch files.
    const prevPatchFiles = getPatchFiles(outputDir, parentId);
    // Initialize the current patch files.
    let currPatchFiles: string[] = [];
    // Initialize the run evaluation flag.
    let runEval = false;
    // Initialize the parent agent success flag.
    let parentAgentSuccess = false;

    try {
      // Setup the executor.
      await executor.setup(prevPatchFiles);

      // Compute the parent's average score across domains.
      const parentScore = getParentAvgScore(outputDir, parentId, domainNames);

      // Run the meta agent with score context and optional prompt file.
      const evalPath = outputDir;
      const result = await metaAgent.forward({
        repoPath: executor.getWorkdir(),
        evalPath,
        iterationsLeft: maxGenerations - genId,
        parentScore,
        promptFile: metaPromptFile,
      });

      parentAgentSuccess = true;

      const diff = await executor.diff();
      const patchFile = path.join(genDir, "agent_output", PATCH_FILENAME);
      ensureDir(path.dirname(patchFile));

      if (diff.trim().length > 0) {
        fs.writeFileSync(patchFile, diff);
        currPatchFiles = [patchFile];
        runEval = true;
        console.log(`  Captured diff: ${diff.split("\n").length} lines`);
      } else {
        console.log(`  No code changes detected.`);
        runEval = false;
      }

      if (runEval) {
        const taskAgent = taskAgentFactory(tools);

        // Use domainFactory to create domains from the edited workdir, so
        // MetaAgent's file edits (e.g. prompt.txt) are picked up by evaluation.
        const evalDomains = config.domainFactory
          ? config.domainFactory(executor.getWorkdir())
          : domains;

        for (const domain of evalDomains) {
          // Create the evaluation directory.
          const evalDir = path.join(genDir, `${domain.config.name}_eval`);
          // Ensure the evaluation directory exists.
          ensureDir(evalDir);

          const numSamples = skipStagedEval
            ? (evalSamples > 0 ? evalSamples : undefined)
            : domain.config.stagedEvalSamples;

          // Run the harness.
          const harnessResult = await runHarness({
            domain,
            agent: taskAgent,
            subset: domain.config.evalSubsets[0] ?? "train",
            numSamples,
            numWorkers: evalWorkers,
            outputDir: evalDir,
          });

          // Generate the report.
          generateReport({
            domain: domain.config.name,
            outputDir: evalDir,
            results: harnessResult.results,
          });

          console.log(`  ${domain.config.name}: score=${harnessResult.score.toFixed(4)}`);
        }
      }
    } catch (err) {
      console.error(`Generation ${genId} failed:`, err);
      runEval = false;
    } finally {
      await executor.cleanup();
    }

    // Create the metadata.
    const metadata = {
      gen_output_dir: genDir,
      current_genid: genId,
      parent_genid: parentId,
      prev_patch_files: prevPatchFiles,
      curr_patch_files: currPatchFiles,
      parent_agent_success: parentAgentSuccess,
      run_eval: runEval,
      valid_parent: runEval,
    };
    // Save the metadata.
    saveGenMetadata(outputDir, genId, metadata);

    // Initialize the scores.
    const scores: Record<string, number> = {};
    // Loop through the domains.
    for (const domain of domains) {
      const evalDir = path.join(genDir, `${domain.config.name}_eval`);
      const reportPath = path.join(evalDir, "report.json");
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
        scores[domain.config.name] = report.averageScore ?? 0;
      }
    }

    // Create the archive entry.
    const entry: ArchiveEntry = {
      genId,
      parentId,
      patchFiles: [...prevPatchFiles, ...currPatchFiles],
      scores,
      metadata,
      validParent: runEval,
      timestamp: new Date().toISOString(),
    };
    // Update the archive with the new entry.
    archive = updateArchive(outputDir, archive, entry);

    // Log the scores.
    console.log(`Generation ${genId} complete. Scores: ${JSON.stringify(scores)}`);
  }

  console.log(`\nGenerate loop complete. Output: ${outputDir}`);
  return outputDir;
}

/**
 * Get the average score for a parent generation.
 * 
 * @param outputDir - The path of the output directory.
 * @param parentId - The ID of the parent generation.
 * @param domains - The names of the domains.
 * @return {number | null} The average score.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function getParentAvgScore(
  outputDir: string,
  parentId: string | number,
  domains: string[]
): number | null {
  // If the parent is a starting node, get the scores for the domains.
  if (isStartingNode(parentId)) {
    const scores: number[] = [];
    for (const domain of domains) {
      const s = getScore(domain, outputDir, parentId, "train");
      if (s != null) scores.push(s);
    }
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  }

  // Get the scores for the domains.
  const scores: number[] = [];
  for (const domain of domains) {
    const s = getScore(domain, outputDir, parentId, "train");
    if (s != null) scores.push(s);
  }
  // If the scores are not for all domains, return null.
  if (scores.length !== domains.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Get the best score in the archive.
 * 
 * @param archive - The archive data.
 * @param outputDir - The path of the output directory.
 * @param domains - The names of the domains.
 * @return {number} The best score.
 * 
 * @since v1.0.0
 * @author Muhammad Umer Farooq<umer@lablnet.com>
 */
function getBestArchiveScore(
  archive: ArchiveData,
  outputDir: string,
  domains: string[]
): number {
  // Initialize the best score.
  let best = -1;
  for (const genId of archive.archive) {
    // Get the scores for the domains.
    const scores: number[] = [];
    // Loop through the domains.
    for (const domain of domains) {
      // Get the score for the domain.
      const s = getScore(domain, outputDir, genId, "train");
      if (s != null) scores.push(s);
    }
    // If the scores are for all domains, calculate the average score.
    if (scores.length === domains.length) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      // Update the best score if the average score is better.
      if (avg > best) best = avg;
    }
  }
  return best;
}

