# Meta-Tasks Plugin

Higher-order goals that are achieved through completion of referenced artifacts rather than direct action.

## Philosophy

**Fast and light.** Meta-tasks are quick to create — just a name, targets, and conditions. No heavyweight specs. Create one in seconds.

**Reference, don't contain.** Meta-tasks point to other artifacts (workspaces, increments, tasks, etc.) and track their collective state. They're lightweight pointers with completion conditions.

**Computed completion.** A meta-task is "done" when its conditions evaluate to true — all linked tasks complete, a workspace archived, an increment shipped. No manual checkbox.

**Todo → Meta-Task → Task.** Fuzzy todos become meta-tasks. Meta-tasks drive creation of proper task specs. The meta-task tracks "did we actually do this?"

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Meta-Task** | A goal achieved through other artifacts. Has completion conditions, not checkboxes. |
| **Condition** | Rule that determines completion. References artifact states. |
| **Target** | The artifact(s) a meta-task tracks. |

## Meta-Task Lifecycle

```
draft → todo → in-progress → done
```

| Status | Meaning |
|--------|---------|
| `draft` | Being defined, not yet actionable |
| `todo` | Ready to track |
| `in-progress` | Actively tracking conditions |
| `done` | All conditions satisfied |

*No abandoned state — just delete the file.*

## Condition Types

| Type | Syntax | Example |
|------|--------|---------|
| Artifact state | `when: [[artifact]] is [state]` | `when: [[Workspace 009]] is completed` |
| All linked | `when: all #tag are done` | `when: all #proj/task are done` |
| Count | `when: N of [[artifacts]] done` | `when: 3 of [[reviews]] done` |

# Dashboards

| Dashboard | Purpose | Maintained By |
|-----------|---------|---------------|
| `(Dashboard) Meta-Backlog.md` | Meta-task backlog by priority | Agent |

# Skills

| Skill | File | Purpose |
|-------|------|---------|
| Create | `sk-mtsk-create.md` | Create a meta-task |
| Complete | `sk-mtsk-complete.md` | Evaluate completion conditions |
| From Todo | `sk-mtsk-from_todo.md` | Convert todo items to meta-tasks |
