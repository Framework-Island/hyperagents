# HyperAgents

Self-improving agent framework powered by LangChain and LangGraph.

Inspired by [HyperAgents](https://github.com/facebookresearch/HyperAgents) (Meta Research, 2026) -- ported to TypeScript with a generic, pluggable architecture.

## What it does

HyperAgents runs an evolutionary self-improvement loop where a **MetaAgent** rewrites a **TaskAgent's** code to make it better at solving tasks. Each generation:

1. Select a parent agent from the archive
2. MetaAgent reads past evaluation scores and edits the source code
3. The modified TaskAgent is evaluated on domain tasks
4. Score + code diff are saved to the archive
5. Repeat

The TaskAgent gets better over generations without manual intervention.

## Quick start

```bash
# Install
pnpm install

# Set your API key
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# Run the self-improvement demo (watch the score go from 0.42 to 1.00)
pnpm demo:scoring
```

## Architecture

```
src/
├── agent/              Agents
│   ├── base_agent.ts     Abstract base class
│   ├── llm.ts            Multi-provider LLM factory (OpenAI, Anthropic, Gemini, Ollama)
│   ├── llm_with_tools.ts LangGraph ReAct agentic loop
│   ├── meta_agent.ts     Modifies code to improve the TaskAgent
│   ├── task_agent.ts     Solves domain tasks
│   └── tool_registry.ts  Generic tool registry
├── prompts/            Prompt templates (separated from logic)
│   ├── task_agent.ts     TaskAgent instruction prompt
│   ├── meta_agent.ts     MetaAgent improvement prompt
│   └── llm_judge.ts      LLM judge scoring prompt
├── tools/              Framework tools (used by MetaAgent)
│   ├── bash.ts           Shell command execution
│   └── editor.ts         File viewing and editing
├── core/               Evolutionary loop
│   ├── generate_loop.ts  Self-improvement loop
│   ├── select_parent.ts  Parent selection strategies
│   └── ensemble.ts       Best-of-archive ensemble
├── domains/            Evaluation framework
│   ├── base.ts           Domain interface
│   ├── harness.ts        Generic evaluation harness
│   ├── report.ts         Score reporting
│   └── evaluators.ts     Pluggable evaluators (static, LLM judge, human feedback)
└── utils/              Infrastructure
    ├── archive.ts        JSONL archive management
    ├── executor.ts       Local + Docker execution
    ├── docker.ts         Docker container management
    ├── git.ts            Git diff/patch operations
    └── common.ts         Shared utilities
```

## Key concepts

### TaskAgent vs MetaAgent

| | TaskAgent | MetaAgent |
|---|---|---|
| Role | Solves tasks | Rewrites the TaskAgent's code |
| Input | A task description | Repo path + past eval scores |
| Output | A prediction | Modified source code on disk |
| Tools | Domain-specific (optional) | bash + editor (built-in) |

### Three evaluator strategies

```typescript
import { staticEvaluator, llmJudgeEvaluator, humanFeedbackEvaluator } from "hyperagents";

// 1. Static: exact string match (free, for tasks with one right answer)
staticEvaluator("42", "42") // => 1.0

// 2. LLM Judge: ask an LLM to score (for subjective tasks)
await llmJudgeEvaluator(prediction, {
  description: "Generate tasks from this email",
  rubric: "Score based on relevance and actionability",
}) // => 0.85

// 3. Human Feedback: pass in user ratings (for production apps)
humanFeedbackEvaluator(4 / 5) // => 0.8
```

### Parent selection strategies

The archive stores every agent generation. Parent selection picks which ancestor to improve next (not necessarily the previous one -- it picks from all valid generations):

- `random` -- any valid parent
- `latest` -- most recent generation
- `best` -- highest scoring
- `score_prop` -- probability proportional to score
- `score_child_prop` -- score-weighted, penalizes over-explored parents (default)

The loop also includes **early termination**: if the best score in the archive reaches 1.0 (100%), the loop stops automatically to avoid wasting compute.

### Execution modes

- **Local** (default): runs in a temp directory, fast for development
- **Docker**: container per generation, safe for untrusted LLM-generated code

## Examples

### Scoring demo (self-improvement in action)

```bash
pnpm demo:scoring
```

A math grading domain where the TaskAgent starts with a bad prompt (strict string matching). The MetaAgent reads the failures and rewrites the prompt to handle mathematical equivalence. Score jumps from 0.42 to 1.00 in one generation.

### Bash scripting

```bash
pnpm example:bash          # single evaluation
npx tsx examples/bash/run.ts evolve  # evolutionary loop
```

TaskAgent generates bash commands from descriptions. Supports both single eval and full evolutionary self-improvement.

### Calculator (tool improvement)

```bash
pnpm example:calculator
```

The TaskAgent has a deliberately buggy calculator tool (only supports +, -, *, /). The MetaAgent reads the failures and edits `calc_tool.ts` to add missing operations (power, modulo, sqrt, abs).

### Fact-check

```bash
npx tsx examples/factcheck/run.ts          # single evaluation
npx tsx examples/factcheck/run.ts evolve   # evolutionary loop
```

TaskAgent classifies statements as true/false. Includes tricky common myths (e.g., "The Great Wall is visible from space"). Uses `runGenerateLoop` for full evolutionary self-improvement.

### Paper review

```bash
pnpm example:paper-review
```

TaskAgent predicts accept/reject for research papers.

## Creating your own domain

Implement the `Domain` interface:

```typescript
import type { Domain, DomainConfig, DomainTask, EvalResult, ReportSummary } from "hyperagents";

class MyDomain implements Domain {
  config: DomainConfig = {
    name: "my_domain",
    evalSubsets: ["train"],
    splits: ["train"],
    stagedEvalSamples: 5,
    scoreKey: "accuracy",
  };

  async loadTasks(subset: string, numSamples?: number): Promise<DomainTask[]> {
    // Load from JSON, database, API, etc.
  }

  async evaluate(prediction: string, task: DomainTask): Promise<number> {
    // Use staticEvaluator, llmJudgeEvaluator, or humanFeedbackEvaluator
  }

  formatInput(task: DomainTask): string {
    // Format the task as a prompt for the TaskAgent
  }

  async report(results: EvalResult[]): Promise<ReportSummary> {
    // Aggregate scores
  }
}
```

## LLM providers

```typescript
import { createLLM } from "hyperagents";

createLLM({ model: "openai/gpt-4o" })
createLLM({ model: "anthropic/claude-sonnet-4-5-20250929" })
createLLM({ model: "gemini/gemini-2.5-pro" })
createLLM({ model: "ollama/llama3" })  // free, runs locally
```

## Docker

Build and run without installing anything locally (except Docker):

```bash
# Build the image
docker build -t hyperagents .

# Run the scoring demo
docker run --rm -e OPENAI_API_KEY=sk-... hyperagents examples/scoring/run.ts

# Run the bash example
docker run --rm -e OPENAI_API_KEY=sk-... hyperagents examples/bash/run.ts

# Run the evolutionary loop
docker run --rm -e OPENAI_API_KEY=sk-... hyperagents examples/bash/run.ts evolve

# Use a different model
docker run --rm \
  -e OPENAI_API_KEY=sk-... \
  -e HYPERAGENTS_MODEL=openai/gpt-4o-mini \
  hyperagents examples/scoring/run.ts

# Mount a volume to persist outputs
docker run --rm \
  -e OPENAI_API_KEY=sk-... \
  -v $(pwd)/outputs:/hyperagents/outputs \
  hyperagents examples/scoring/run.ts
```

For Anthropic or Gemini models, pass the corresponding API key:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e HYPERAGENTS_MODEL=anthropic/claude-sonnet-4-5-20250929 \
  hyperagents examples/scoring/run.ts
```

## Based on

- [HyperAgents](https://github.com/facebookresearch/HyperAgents) -- Self-referential self-improving agents (Meta Research, 2026)
- [LangChain](https://github.com/langchain-ai/langchainjs) -- LLM framework
- [LangGraph](https://github.com/langchain-ai/langgraphjs) -- Agentic state machines

## License

MIT
