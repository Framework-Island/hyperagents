# Architecture

This page matches the **library** layout in the HyperAgents repository. Paths are relative to the package root when you clone or install the source.

## Repository map

```text
docs/                  # Markdown concept + limitation notes (source of truth)
src/
├── agent/             # Agents
│   ├── base_agent.ts
│   ├── llm.ts                 # Multi-provider LLM factory
│   ├── llm_with_tools.ts      # LangGraph ReAct loop
│   ├── meta_agent.ts          # Improves TaskAgent via patches
│   ├── task_agent.ts          # Solves domain tasks
│   └── tool_registry.ts
├── prompts/           # Default prompt templates (overridable by files)
├── tools/             # bash, editor (+ registry)
├── core/              # Evolution
│   ├── generate_loop.ts       # Main outer loop
│   ├── select_parent.ts       # Parent selection strategies
│   └── ensemble.ts            # Best-of-archive predictions
├── domains/           # Evaluation
│   ├── base.ts                # Domain interface
│   ├── harness.ts             # TaskAgent ↔ domain runner
│   ├── report.ts
│   └── evaluators.ts          # static / LLM judge / human
└── utils/
    ├── archive.ts             # JSONL archive
    ├── executor.ts            # Local + Docker
    ├── docker.ts
    ├── git.ts                 # Patches and diffs
    └── common.ts
examples/              # Bash, scoring, calculator, factcheck, paper_review, git_evolution
```

## Core flows (where to read code)

| Concern | Main module | Role |
| --- | --- | --- |
| One full evolution run | `src/core/generate_loop.ts` | Parent pick → executor → patches → MetaAgent → eval → archive |
| Running tasks + scoring | `src/domains/harness.ts` | `formatInput` → TaskAgent → `evaluate` per task |
| History of generations | `src/utils/archive.ts` | Load/save JSONL, scores, patch chains |
| Sandboxed runs | `src/utils/executor.ts` | `local` vs `docker` workspace lifecycle |

## Data flow (high level)

1. **Archive** records `genId`, `parentId`, `patchFiles`, `scores`, metadata.
2. **Parent selection** (`select_parent.ts`) chooses a valid parent for the next mutation.
3. **Executor** recreates that parent’s tree (patch replay), then **MetaAgent** adds a new diff.
4. **Harness** runs the new TaskAgent on domain tasks; **report** aggregates scores.
5. A new archive entry is **appended** (JSONL snapshot).

See [Workflows](./workflows.md) for diagrams.

## Public API surface

All stable exports are listed in [API reference](../reference/api.md) (`src/index.ts`).
