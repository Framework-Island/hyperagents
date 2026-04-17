---
home: true
heroText: HyperAgents
heroImage: /logo.png
tagline: Evolutionary self-improving agent framework powered by LangChain and LangGraph. ⚠️ EXPERIMENTAL
actions:
  - text: Get Started
    link: /guide/quick-start.html
    type: primary
  - text: Basic Concepts
    link: /guide/concepts.html
    type: secondary
  - text: Limitations
    link: /guide/limitations.html
    type: secondary
features:
  - title: Self-Improving
    details: Uses evolutionary algorithms to improve agent logic (prompts, tools, and TypeScript) and keeps an archive of scored generations with branching lineage.
  - title: Pluggable Architecture
    details: Works with multiple LLMs via LangChain and agentic flows via LangGraph; plug in domains with static, LLM judge, or human feedback evaluators.
  - title: Agentic Self-Modification
    details: MetaAgent edits the program under evaluation using bash and editor tools; run locally or in Docker for safer sandboxing.
footer: MIT Licensed
---

> **Note:** Inspired by [HyperAgents](https://github.com/facebookresearch/HyperAgents) (Meta Research, 2026).
