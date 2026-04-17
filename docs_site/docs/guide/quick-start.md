# Quick start

## Prerequisites

- Node.js **18+**
- [pnpm](https://pnpm.io/)
- An API key for your chosen model (e.g. `OPENAI_API_KEY` for OpenAI)

## Use as a package

```bash
pnpm add @lablnet/hyperagents
```

Import agents, loop, domains, and utilities from `@lablnet/hyperagents`. See [API reference](../reference/api.md).

## Run from this repository

```bash
git clone https://github.com/Framework-Island/hyperagents.git
cd hyperagents
pnpm install
cp .env.example .env   # set OPENAI_API_KEY (and others if needed)
```

### Scoring demo (recommended first run)

```bash
pnpm demo:scoring
```

Watch average score improve as the MetaAgent fixes prompt logic (e.g. math equivalence vs strict string match).

### Other examples

| Command | What it shows |
| --- | --- |
| `pnpm example:bash` | Bash command generation |
| `pnpm demo:calculator` | Tool code fixed by evolution |
| `pnpm example:paper-review` | Accept/reject style task |
| `npx tsx examples/bash/run.ts evolve` | Full loop on bash domain |
| `pnpm demo:git-evolution` | Git-based patches, full loop |

## LLM providers (library)

```typescript
import { createLLM } from "@lablnet/hyperagents";

createLLM({ model: "openai/gpt-4o" });
createLLM({ model: "anthropic/claude-sonnet-4-5-20250929" });
createLLM({ model: "gemini/gemini-2.5-pro" });
createLLM({ model: "ollama/llama3" });
```

## Docker (optional)

From the repo root, build and run as in the main [README](https://github.com/Framework-Island/hyperagents#docker): mount volumes for keys and outputs as needed.

## Documentation site

```bash
cd docs_site
pnpm install
pnpm docs:dev
```

Then open the URL VuePress prints (usually `http://localhost:8080`).

## Further reading

- [Concepts](./concepts.md) — archive, harness, parent selection, prompt files.
- [Limitations](./limitations.md) — cost, frozen model, framework boundaries.
