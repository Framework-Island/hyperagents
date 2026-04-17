# Introduction

HyperAgents is a **self-improving agent framework**. Instead of hand-tuning prompts and tools, you run an **evolutionary loop**: a **MetaAgent** reads evaluation results and edits the **TaskAgent**’s codebase (prompts, domain logic, tools); each version is scored and stored in an **archive** so future generations can branch from the best ancestors.

The design is inspired by [HyperAgents (Meta Research, 2026)](https://github.com/facebookresearch/HyperAgents) and ported to TypeScript with a **generic, pluggable** layout: LangChain for models, LangGraph for the tool loop, and a small core for evolution, archives, and execution.

## What you get

- **TaskAgent** — solves tasks for your domain (optional tools, ReAct-style loop).
- **MetaAgent** — uses built-in `bash` and `editor` tools to patch the repo under evaluation.
- **`runGenerateLoop`** — selects parents, applies lineage patches, runs MetaAgent then evaluation, updates **JSONL** archive.
- **Domains** — implement `loadTasks`, `evaluate`, `formatInput`, `report` for your tasks.
- **Executors** — **local** (fast) or **Docker** (isolated) workspaces per generation.

## Mental model

Think of the MetaAgent as the **teacher** updating the textbook, and the TaskAgent as the **student** taking exams with the latest textbook. The archive is the **gradebook plus revision history**.

For narrative and **workflow diagrams** together, see [Basic concepts](./concepts.md).

## Relation to the research paper

The paper’s idea of **self-referential** improvement — the improver changing its own instructions — maps to **editable prompt files** (`promptFile` / `promptsDir`) in the workspace. The underlying **LLM weights** are not trained; all improvement is **external** (code and prompts). See [Limitations](./limitations.md).

## Next steps

- [Quick start](./quick-start.md) — install, env, first demo.
- [Architecture](./architecture.md) — repository layout and modules.
- [Reference: API](../reference/api.md) — public exports.
