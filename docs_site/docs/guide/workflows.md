# Workflows (diagrams)

High-signal **Mermaid** views of the system. For narrative detail, see [Concepts](./concepts.md).

## Evolutionary loop (outer loop)

```mermaid
flowchart LR
  subgraph archiveBlock [Archive]
    Archive[(archive.jsonl)]
  end
  Select[selectParent]
  Setup[setupExecutor]
  Patches[applyLineagePatches]
  Meta[runMetaAgent]
  Eval[runHarnessAndReport]
  Save[updateArchive]
  Select --> Setup --> Patches --> Meta --> Eval --> Save
  Save --> Archive
  Archive --> Select
```

Each generation: pick a **parent**, materialize its code in a workspace, let **MetaAgent** mutate it, **evaluate** with the harness, then **append** a new snapshot to the archive.

## One generation (sequence)

```mermaid
sequenceDiagram
  participant Loop as generateLoop
  participant Arch as archive
  participant Exec as executor
  participant Meta as metaAgent
  participant Task as taskAgent
  participant Dom as domain
  Loop->>Arch: loadArchive / selectParent
  Loop->>Exec: setup(patchChain)
  Loop->>Meta: improve repo from eval feedback
  Meta->>Exec: write diff / files
  Loop->>Task: forward per task
  Task->>Dom: prediction
  Loop->>Dom: evaluate(prediction)
  Loop->>Arch: save generation scores patches
```

## TaskAgent vs MetaAgent

```mermaid
flowchart TB
  subgraph meta [MetaAgent]
    MIn[repoPath + eval results + score context]
    MTools[bash + editor tools]
    MOut[patch / edited files]
    MIn --> MTools --> MOut
  end
  subgraph task [TaskAgent]
    TIn[task prompt]
    TTools[optional domain tools]
    TOut[prediction string]
    TIn --> TTools --> TOut
  end
  meta -->|mutates code prompts tools| task
```

## Harness (per task)

```mermaid
flowchart LR
  T[domainTask] --> F[formatInput]
  F --> A[taskAgent.forward]
  A --> P[prediction]
  P --> E[domain.evaluate]
  E --> S[score 0 to 1]
```

## Archive lineage (example)

Different children can have different parents — the history is a **tree**, not only a line.

```mermaid
flowchart TD
  initial[initial]
  g1[gen1]
  g2[gen2]
  g3[gen3]
  g4[gen4]
  g5[gen5]
  initial --> g1
  g1 --> g2
  g1 --> g3
  g2 --> g4
  initial --> g5
```

## Executor choice

```mermaid
flowchart TD
  Q[executionMode]
  Q -->|local| L[LocalExecutor temp dir fast dev]
  Q -->|docker| D[DockerExecutor isolated per generation]
```

## Self-referential prompts (optional)

When `promptsDir` is set, prompt text files live in the user repo and can be edited by the MetaAgent across generations — including **its own** instructions.

```mermaid
flowchart LR
  promptsDir[promptsDir] --> metaTxt[meta_agent.txt]
  promptsDir --> taskTxt[task_agent.txt]
  MetaA[MetaAgent] -->|reads writes| metaTxt
  MetaA -->|reads writes| taskTxt
```

## Where to go next

- [Concepts](./concepts.md) — strategies, evaluators, JSONL, early termination.
- [Limitations](./limitations.md) — frozen LLM, costs, outer-loop design.
