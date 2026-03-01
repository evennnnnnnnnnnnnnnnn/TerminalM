# Filename: Mesh/(Plan) XXX [Name].md

/* XXX is a 3-digit number like 001, 002, etc. */

```markdown
---
id: [generate-uuid]
tags:
  - "#plan"
  - "#plan/plan"
  - "#ld/living"
status: [draft|approved|spent]
realized-into:
  - [[realized into artifacts]] [leave empty at start]
  (continue)
meta-task: [[create a meta-task to finish this plan using `@sk-mtsk-create`]]
template: tmp-plan-plan
---

# [Plan title - what we're planning]

## Goal

[What are we trying to achieve? The core intention in 1-3 sentences]

## Context

[Background information, constraints, relevant existing work. Include links to related mesh documents and workspace references discovered during research]

**Related Documents**

- [[hyperlink to related files]]
(continue)

## Approach

[High-level strategy and steps. Not implementation details — that's for specs/tasks]

### [Approach section 1]

[Description]

(continue as needed)

## Open Questions

- [ ] [Question that needs answering before approval]
(continue)

## Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| [What was decided] | [Why] | [YYYY-MM-DD] |
(continue)

## Next Steps

[What this plan becomes when realized — specs to write, tasks to create, increments to spawn]

- [ ] [Downstream artifact to create]
(continue)
```

/* State Transitions - update tags when state changes:
   - draft → approved: Replace #plan/draft with #plan/approved, resolve all Open Questions
   - approved → spent: Replace #plan/approved with #plan/spent, replace #ld/living with #ld/dead
*/
