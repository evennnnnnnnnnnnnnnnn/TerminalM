# Filename: Mesh/Code Docs/[workspace]/(Feature) [Name].md

```markdown
---
id: [generate-uuid]
tags:
  - "#code-docs"
  - "#code-docs/feature"
  - "#ld/living"
workspace: [workspace-name]
covers:
  - [path/to/feature/files/]
  (continue)
last-sync: [YYYY-MM-DD]
template: tmp-cdocs-feature
---

# [Feature Name]

## User Story

[What the user can do and why they want to. Written from user perspective.]

> As a [user type], I want to [action] so that [benefit].

## Behavior

[Observable behavior from the user's perspective]

### [Scenario 1]

**Given:** [preconditions]
**When:** [user action]
**Then:** [expected result]

(continue)

## Implementation

[How the feature is implemented in code]

### Entry Points

| Entry Point | Location | Description |
|-------------|----------|-------------|
| [UI element/API endpoint] | `[file path]` | [What triggers the feature] |
(continue)

### Components Involved

- [[Component]] - [Role in this feature]
(continue)

### Data Model

[What data this feature reads/writes]

## Configuration

[Feature flags, settings, environment variables that affect this feature]

## Permissions

[Who can use this feature, access control requirements]

## Testing

[How to test this feature - manual steps and automated test locations]

### Manual Test

1. [Step 1]
2. [Step 2]
(continue)

### Automated Tests

- `[path/to/test.ts]` - [What it tests]
(continue)

## Related

- [[Related features]]
- [[Process docs for underlying flows]]
(continue)
```

/* Feature docs bridge the user mental model to code implementation.
   They start with user-facing behavior and trace down to code.
   The covers field includes all files that implement the feature. */
