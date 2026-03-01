# Code Docs Plugin

Exhaustive codebase documentation with coverage tracking.

# Artifacts

- Architecture → `tmp-cdocs-architecture`
  - High-level design docs covering system-wide patterns and decisions
- Module → `tmp-cdocs-module`
  - Package/directory documentation for cohesive code units
- Component → `tmp-cdocs-component`
  - Class/service/hook documentation for specific implementations
- Process → `tmp-cdocs-process`
  - Runtime flows, pipelines, and lifecycles
- Feature → `tmp-cdocs-feature`
  - User-facing capability bridging mental model to code

# YAML Schema

All code docs share this frontmatter schema:

```yaml
---
id: <uuid>
tags:
  - "#code-docs"
  - "#code-docs/<type>"      # architecture, module, component, process, feature
  - "#ld/living"
workspace: <workspace-name>   # Which codebase this documents
covers:
  - path/to/dir/
  - path/to/file.ts
last-sync: YYYY-MM-DD         # When doc was last verified against source
template: tmp-cdocs-<type>
---
```

## Field Definitions

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | UUID for the document |
| `tags` | Yes | Must include `#code-docs` and type-specific tag |
| `workspace` | Yes | Name of the workspace reference this documents |
| `covers` | Yes | List of file/directory paths this doc covers |
| `last-sync` | Yes | ISO 8601 date when doc was last synced with source |
| `template` | Yes | Template used to create this doc |

## The `covers` Field

The `covers` field is central to coverage tracking:

- List paths relative to workspace root
- Directories should end with `/` (covers all files within)
- Files are specific paths
- A file can appear in multiple docs' covers lists
- Used by `flint codedocs coverage` to compute coverage

Examples:
```yaml
covers:
  - src/api/                    # All files in src/api/
  - src/utils/auth.ts           # Specific file
  - src/middleware/             # All middleware files
```

# File Naming

Code docs use type prefixes:

```
(Architecture) System Overview.md
(Module) src-api.md
(Component) AuthService.md
(Process) Request Lifecycle.md
(Feature) User Login.md
```

# Interactions & Dependencies

- Core
  - Uses plugin file patterns (init, skills, workflows, templates)
- Living Documents
  - Code docs use `#ld/living` and `#ld/dead` tags
  - Use `@sk-ld-sync` for coherence updates
- Workspace (linked codebases)
  - The `workspace:` field references entries from Workspace folder
  - Code docs document files within those linked codebases

# Interaction Guidelines

- To create a code doc: use `@sk-cdocs-create` with appropriate template
- To update after code changes: use `@sk-cdocs-update`
- To initialize for a new workspace: use `@wkfl-cdocs-init`
- To audit coverage: use `@wkfl-cdocs-review`
- Always set `last-sync` to current date when creating or updating
