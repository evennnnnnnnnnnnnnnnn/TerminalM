# Filename: Mesh/Code Docs/[workspace]/(Module) [name].md

```markdown
---
id: [generate-uuid]
tags:
  - "#code-docs"
  - "#code-docs/module"
  - "#ld/living"
workspace: [workspace-name]
covers:
  - [path/to/module/dir/]
last-sync: [YYYY-MM-DD]
template: tmp-cdocs-module
---

# [Module Name]

## Purpose

[What this module does and why it exists. 1-3 sentences.]

## Location

`[path/to/module/]`

## Structure

```
[module-name]/
├── [file1.ts]      # [brief description]
├── [file2.ts]      # [brief description]
├── [subdir/]       # [brief description]
│   └── [file.ts]
(continue)
```

## Public API

[What this module exports for use by other parts of the codebase]

### [Export Name]

[Description, parameters, return value, usage example]

(continue)

## Internal Details

[Implementation notes for maintainers. Key algorithms, data structures, gotchas.]

## Dependencies

| Dependency | Purpose |
|------------|---------|
| [package or module] | [Why it's used] |
(continue)

## Configuration

[Any configuration this module requires or respects]

## Testing

[How to test this module, what test files exist, coverage notes]

## Related

- [[Parent module or architecture doc]]
- [[Related component docs]]
(continue)
```

/* Module docs cover a directory/package as a cohesive unit.
   The covers field typically includes the entire directory.
   For complex modules, individual files may have their own Component docs. */
