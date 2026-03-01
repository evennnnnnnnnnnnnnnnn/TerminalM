# Filename: Mesh/Code Docs/[workspace]/(Process) [Name].md

```markdown
---
id: [generate-uuid]
tags:
  - "#code-docs"
  - "#code-docs/process"
  - "#ld/living"
workspace: [workspace-name]
covers:
  - [path/to/file/involved/in/process.ts]
  (continue)
last-sync: [YYYY-MM-DD]
template: tmp-cdocs-process
---

# [Process Name]

## Overview

[What this process accomplishes. When/why it runs. 1-3 sentences.]

## Trigger

[What initiates this process - user action, API call, scheduled job, event, etc.]

## Flow

[Step-by-step description of what happens]

### Step 1: [Step Name]

**Location:** `[file:function]`

[What happens in this step]

### Step 2: [Step Name]

**Location:** `[file:function]`

[What happens in this step]

(continue)

## Sequence Diagram

```
[ASCII or mermaid sequence diagram showing the flow]
```

## Data Flow

[What data moves through this process, how it transforms]

| Stage | Input | Output |
|-------|-------|--------|
| [Step] | [Input data] | [Output data] |
(continue)

## Error Handling

[What can go wrong and how errors are handled at each stage]

| Error | Handling | Recovery |
|-------|----------|----------|
| [Error type] | [How it's caught] | [What happens next] |
(continue)

## Performance

[Performance characteristics, bottlenecks, optimization notes]

## Related

- [[Components involved]]
- [[Related processes]]
(continue)
```

/* Process docs describe runtime flows: request lifecycles, data pipelines,
   background job sequences, event handling chains.
   The covers field includes all files that participate in the process. */
