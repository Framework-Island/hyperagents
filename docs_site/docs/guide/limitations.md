# Limitations

While HyperAgents enables powerful self-improving agents, several technical and practical limitations exist in the current implementation.

### Frozen foundation models

The most significant limitation is that **the underlying Large Language Model (LLM) is frozen**.

- HyperAgents improves the **Agent Logic** (TypeScript code, prompts, and tools), but it **cannot** update the weights or training of the model itself.
- All improvements are "external" to the model's core architecture.

### Framework immutability (self-update paradox)

**The Agent cannot evolve its own core classes!**

Because HyperAgents is often installed as a library (via `npm`/`pnpm`), the core code for `TaskAgent` and `MetaAgent` lives in `node_modules/`.

- The MetaAgent **cannot** modify its own framework code or its class definitions.
- Even in a local setup, the evolutionary loop targets a specific `repoPath`. If the agent's primary logic is outside that directory, the MetaAgent cannot reach it.
- This is why the framework focuses on evolving **prompts in external files** and **local domain logic** — the core agent infrastructure remains static and generic.
- Workaround: use `promptsDir` to place editable prompt files in the workspace so the MetaAgent can modify its own instructions.

### Fixed task distribution

Currently, the system optimizes for a **fixed set of tasks** provided by the user. Truly unbounded open-endedness requires a system that can also generate its own tasks and curriculum (co-evolution), which is a future research direction.

### Static outer loop

While the agent can modify almost all of its own codebase, the **outer evolutionary process** is currently human-engineered:

- **Parent Selection**: The logic for choosing which generations to branch from is fixed.
- **Evaluation Protocols**: The way task scripts are run and scored is defined in the initial configuration.

### Computational cost

Evolutionary computation is resource-intensive.

- **Generations**: Each experiment typically requires 10–50+ iterations for meaningful improvement.
- **Costs**: Each generation makes multiple LLM API calls (MetaAgent + TaskAgent per task). A full run with GPT-4o can cost $5–50+ depending on the number of generations and tasks.
- **Latency**: Each generation takes 20–120 seconds depending on task count and model speed.

---

For what the framework *can* do well, see [Introduction](./introduction.md) and [Basic concepts](./concepts.md).
