This workflow belongs to the Plan plugin. Ensure you have @init-plan.md in context before continuing.

# Workflow: Create Plan

Start a new plan with research phase and iterative refinement.

# Input

- intent: What the human wants to achieve (can be vague initially)

# Actions

## Stage 1: Capture Intent

- Listen to user's initial description
- Create plan artifact using @tmp-plan-plan with:
  - Ensure the numbering of the plan is the correct one by finding the latest Plan number
  - Title derived from intent
  - Goal section filled from user's description
  - Other sections as placeholders
- Create a meta-task to finish this plan using `@sk-mtsk-create` append it to the yaml field (ENSURE THIS IS DONE DO NOT SKIP THIS METATASK CREATION, AND ACTUALLY CREATE THE METATASK FILE AND RUN THE SKILL) and set the plan status to `draft`
- If we are working in the context of an increment, please attach the plan to the increment. 

## Stage 2: Research

Immediately after creating the plan, spawn multiple subagents in parallel:

- **Flint Search Agent**: Search the mesh for related documents
  - Look for existing plans, tasks, increments on similar topics
  - Find relevant models and concepts
  - Identify prior decisions or approaches
- **Workspace Search Agent** (if workspace references exist): Search linked codebases
  - Find relevant code, configs, or docs
  - Identify existing implementations to build on
  - Note patterns and conventions

Synthesize findings:
- Update **Context** section with research findings
- Propose initial **Approach** based on research
- List **Open Questions** discovered during research

## Stage 3: Refine

Iterative conversation to refine the plan:

- Present the researched plan to user
- User provides feedback, clarifications, or new directions
- Update plan document directly using `@sk-plan-refine`
- Repeat until user is satisfied
- Resolve Open Questions through discussion, recording Decisions

## Stage 4: Approve

- User reviews final plan
- Confirm all Open Questions are resolved
- User approves the plan
- Update status to `approved`
- Plan is now ready for `@sk-plan-realize`

# Output

- Plan artifact in `approved` state
- Dashboard updated with new plan
- Ready to convert to specs/tasks via `@sk-plan-realize`
