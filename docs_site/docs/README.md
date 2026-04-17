---
home: true
heroText: HyperAgents
tagline: Self-improving agents with an evolutionary loop — TypeScript, LangChain, and LangGraph.
actions:
  - text: Introduction
    link: /guide/introduction.html
    type: primary
  - text: Workflow diagrams
    link: /guide/workflows.html
    type: secondary
  - text: API reference
    link: /reference/api.html
    type: secondary
features:
  - title: MetaAgent + TaskAgent
    details: A teacher agent rewrites the worker agent’s code, prompts, and tools from evaluation feedback.
  - title: Archive & lineage
    details: Every generation is stored with scores and patches so you can branch, compare, and ensemble.
  - title: Pluggable domains
    details: Implement the Domain interface, pick static, LLM judge, or human feedback evaluators, run locally or in Docker.
footer: MIT Licensed · Documentation generated with VuePress
---

### Quick local docs

From the repository root:

```bash
cd docs_site && pnpm install && pnpm docs:dev
```

Package concepts and limitations also live in the main repo under `docs/` (Markdown sources of truth). This site expands them with navigation and diagrams.

See [Limitations](/guide/limitations.html) before relying on the framework in production.
