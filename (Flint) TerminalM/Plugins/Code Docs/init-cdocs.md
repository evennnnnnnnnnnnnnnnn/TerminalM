# Code Docs Plugin

Exhaustive codebase documentation with coverage tracking. Every code file should be documented somewhere.

## Philosophy

**Exhaustive coverage.** The goal is complete documentation of a codebase. Every file should be covered by at least one doc. Use `flint codedocs coverage` to find gaps.

**Flexible granularity.** You decide the depth. A simple utility file might be covered by its parent Module doc. A complex service deserves its own Component doc. Match documentation depth to code complexity.

**Overlap is fine.** Multiple docs can cover the same file. A file might appear in both a Module doc (for context) and a Component doc (for details). The `covers:` field tracks what each doc documents.

**Sync discipline.** When code changes, docs should update. The `last-sync` field tracks when a doc was last verified against its source. Use `@sk-cdocs-update` after code changes.

## Primitives

Code docs use five primitive types. Choose based on what you're documenting:

| Primitive | Purpose | When to Use |
|-----------|---------|-------------|
| **Architecture** | High-level design, decisions, patterns | System-wide concerns, cross-cutting architecture |
| **Module** | Package/directory documentation | Cohesive unit of code (a folder with related files) |
| **Component** | Class/service/hook documentation | Specific implementation worth detailed treatment |
| **Process** | Runtime flows, pipelines, lifecycles | "What happens when X occurs" |
| **Feature** | User-facing capability | Bridges user mental model to code |

Primitives are extensible. Add new templates as needed without changing the core system.

## File Organization

Code docs live in `Mesh/Code Docs/<workspace>/`:

```
Mesh/
└── Code Docs/
    └── my-workspace/
        ├── (Architecture) System Overview.md
        ├── (Module) src-api.md
        ├── (Component) AuthService.md
        ├── (Process) Request Lifecycle.md
        └── (Feature) User Login.md
```

## Coverage Tracking

Every code doc has a `covers:` field listing the files/directories it documents:

```yaml
covers:
  - src/api/
  - src/middleware/auth.ts
```

The CLI command `flint codedocs coverage <workspace>` shows:
- Which files are covered and by what docs
- Which files are uncovered (documentation gaps)

## Skills

| Skill | File | Purpose |
|-------|------|---------|
| Create | `sk-cdocs-create.md` | Create a new doc from template |
| Update | `sk-cdocs-update.md` | Update a doc after code changes |

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| Init | `wkfl-cdocs-init.md` | Initialize code docs for a workspace |
| Review | `wkfl-cdocs-review.md` | Review coverage and fill gaps |

## Tags

- `#code-docs` - All code documentation
- `#code-docs/architecture` - Architecture docs
- `#code-docs/module` - Module docs
- `#code-docs/component` - Component docs
- `#code-docs/process` - Process docs
- `#code-docs/feature` - Feature docs
