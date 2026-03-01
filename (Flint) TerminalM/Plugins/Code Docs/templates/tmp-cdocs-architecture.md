# Filename: Mesh/Code Docs/[workspace]/(Architecture) [Name].md

```markdown
---
id: [generate-uuid]
tags:
  - "#code-docs"
  - "#code-docs/architecture"
  - "#ld/living"
workspace: [workspace-name]
covers:
  - [path/to/covered/dir/]
  - [path/to/covered/file.ts]
  (continue)
last-sync: [YYYY-MM-DD]
template: tmp-cdocs-architecture
---

# [Architecture Name]

## Overview

[High-level description of this architectural concern. What problem does it solve? Why does this architecture exist?]

## Key Concepts

| Concept | Description |
|---------|-------------|
| [Concept name] | [What it is and why it matters] |
(continue)

## Design Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| [What was decided] | [Why this approach] | [What else was considered] |
(continue)

## Patterns

### [Pattern Name]

[Description of the pattern, when to use it, and examples of where it appears in the codebase]

(continue)

## Components

[List the major components that implement this architecture]

- [[Component link]] - [Brief description]
(continue)

## Cross-Cutting Concerns

[How this architecture handles cross-cutting concerns like logging, error handling, security, etc.]

## Diagrams

[Include ASCII diagrams, mermaid diagrams, or references to diagram files]

## Related

- [[Related architecture docs]]
- [[Related module docs]]
(continue)
```

/* Architecture docs are for system-wide concerns that span multiple modules/components.
   Use for: dependency injection, event systems, state management patterns, API design, etc.
   The covers field should include all directories/files that implement this architecture. */
