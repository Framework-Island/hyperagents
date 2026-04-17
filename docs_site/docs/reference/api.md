# API reference

Public exports from `@lablnet/hyperagents` (`src/index.ts`). Types are TypeScript-only at compile time.

## Agents and LLM

| Export | Kind | Description |
| --- | --- | --- |
| `AgentSystem` | class | Base agent system (`AgentOptions`). |
| `createLLM` | function | Factory for chat models from a model id string. |
| `MODELS` | const | Known model identifiers / helpers. |
| `LLMConfig`, `ModelId` | types | Configuration types for `createLLM`. |
| `ToolRegistry` | class | Register tools for agents. |
| `chatWithAgent` | function | LangGraph ReAct-style loop with tools. |
| `ChatWithAgentOptions`, `ChatResult` | types | Options and result for `chatWithAgent`. |
| `TaskAgent` | class | Domain task solver. |
| `TaskInput`, `TaskResult` | types | Task IO types. |
| `MetaAgent` | class | Repo editor / improver agent. |
| `MetaAgentForwardOptions` | type | Options for MetaAgent runs. |

## Prompts

| Export | Description |
| --- | --- |
| `taskAgentPrompt`, `TASK_AGENT_PROMPT_TEMPLATE`, `TaskAgentPromptOptions` | TaskAgent prompt builder + default template. |
| `metaAgentPrompt`, `META_AGENT_PROMPT_TEMPLATE`, `MetaAgentPromptOptions` | MetaAgent prompt builder + default template. |
| `llmJudgePrompt`, `LLMJudgePromptOptions` | LLM-as-judge prompt helper. |

## Tools

| Export | Description |
| --- | --- |
| `createBashTool` | Shell execution tool factory. |
| `createEditorTool` | View/edit file tool factory. |
| `getFrameworkTools` | Default MetaAgent tool set (bash + editor). |

## Evolution core

| Export | Description |
| --- | --- |
| `runGenerateLoop` | Main evolutionary self-improvement loop. |
| `GenerateLoopConfig` | type — loop configuration. |
| `selectParent` | Select a parent id from archive data. |
| `SelectionStrategy` | type — `"random"` \| `"latest"` \| `"best"` \| `"score_prop"` \| `"score_child_prop"`. |
| `ensemble` | Combine archive entries for best prediction. |

## Domains and evaluation

| Export | Description |
| --- | --- |
| `Domain`, `DomainConfig`, `DomainTask`, `EvalResult`, `ReportSummary` | types — implement `Domain` for custom benchmarks. |
| `runHarness` | Run TaskAgent over loaded tasks. |
| `HarnessOptions`, `HarnessResult` | types — harness IO. |
| `generateReport` | Build report artifacts from eval results. |
| `ReportOptions` | type — reporting options. |
| `staticEvaluator` | String match evaluator. |
| `llmJudgeEvaluator` | LLM rubric evaluator. |
| `humanFeedbackEvaluator` | Map human rating to score. |
| `EvaluatorType` | type — evaluator discriminator if used. |

## Execution and infrastructure

| Export | Description |
| --- | --- |
| `createExecutor`, `LocalExecutor`, `DockerExecutor`, `Executor` | Workspace factories and interface. |
| `DockerManager`, `DockerConfig` | Docker helper types for container mode. |
| `loadArchive`, `saveArchive`, `updateArchive` | Archive JSONL IO. |
| `getAvgScore`, `getBestScore` | Score helpers over archive entries. |
| `ArchiveData`, `ArchiveEntry` | Archive types. |
| `createGitOps`, `applyPatch`, `applyPatches`, `diffVersusCommit`, `hardReset` | Git and patch utilities. |
| `extractJsons`, `fileExistsAndNotEmpty`, `loadJsonFile`, `ensureDir` | Small file/JSON helpers. |
| `REPO_NAME`, `DEFAULT_OUTPUT_DIR`, `ARCHIVE_FILENAME`, `PATCH_FILENAME` | Constants used by tooling and loops. |

## Usage pattern

```typescript
import {
  MetaAgent,
  TaskAgent,
  createLLM,
  getFrameworkTools,
  runGenerateLoop,
  type GenerateLoopConfig,
} from "@lablnet/hyperagents";
```

See [Quick start](../guide/quick-start.md) and [Concepts](../guide/concepts.md) for end-to-end wiring.
