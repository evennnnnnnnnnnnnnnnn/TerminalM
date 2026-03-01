# Plan Plugin

High-level planning that maps directly to human intention. Plans are upstream of everything else — specs, tasks, projects, and increments all flow from plans.

## Philosophy

**Plans capture intent.** Before diving into implementation details, capture what you actually want to achieve. Plans are the closest artifact to raw human intention.

**Research before planning.** Gather context from the mesh and workspace before proposing approaches. Spawn subagents to search for related work, prior decisions, and relevant code.

**Refine through conversation.** Plans evolve through dialogue, not in isolation. Edit the plan document directly as understanding deepens.

**Plans are spent, not completed.** Once a plan becomes specs/tasks, it's "spent" — its value has been extracted into downstream artifacts.

## Plan Lifecycle

```
draft → approved → spent
```

| Status | Meaning |
|--------|---------|
| `draft` | Plan is being refined through conversation |
| `approved` | Human has signed off, ready to realize into downstream artifacts |
| `spent` | Plan has been converted to specs/tasks, archived |

## Dashboards

| Dashboard | Purpose | Maintained By |
|-----------|---------|---------------|
| `(Dashboard) Plans.md` | Track all plans by state | Agent |

## Skills

| Skill | File | Purpose |
|-------|------|---------|
| Refine | `sk-plan-refine.md` | Continue refining an active plan based on new input |
| Realize | `sk-plan-realize.md` | Convert approved plan into downstream artifacts |

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| Create | `wkfl-plan-create.md` | Start a new plan with research phase and iterative refinement |
