# Filename: Mesh/Code Docs/[workspace]/(Component) [Name].md

```markdown
---
id: [generate-uuid]
tags:
  - "#code-docs"
  - "#code-docs/component"
  - "#ld/living"
workspace: [workspace-name]
covers:
  - [path/to/component.ts]
  - [path/to/component.test.ts]
  (continue)
last-sync: [YYYY-MM-DD]
template: tmp-cdocs-component
---

# [Component Name]

## Purpose

[What this component does. 1-2 sentences.]

## Location

`[path/to/component.ts]`

## Interface

[Public interface - what other code can call/use]

### [Method/Function Name]

```typescript
[signature]
```

[Description, parameters, return value, exceptions]

(continue)

## Behavior

[How the component works internally. Key logic flows, state management, side effects.]

### [Behavior Aspect]

[Description]

(continue)

## Dependencies

| Dependency | Purpose |
|------------|---------|
| [import] | [Why it's used] |
(continue)

## Usage Examples

```typescript
[Example code showing how to use this component]
```

## Edge Cases

[Known edge cases, gotchas, limitations]

- [Edge case description]
(continue)

## Related

- [[Parent module doc]]
- [[Related components]]
(continue)
```

/* Component docs cover specific implementations: classes, services, hooks, utilities.
   Use when a file is complex enough to warrant dedicated documentation.
   Simple files can be covered by their parent Module doc instead. */
