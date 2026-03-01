# Increments Plugin

Version-controlled work tracking. Streams hold tasks, iterate as progress is made, and consolidate into checkpoints.

## Version Format

```
X.N.I = Checkpoint.Stream.Iteration

5.2.3 = Checkpoint 5, Stream 2, Iteration 3
```

## The Model

```
4.0.0 ─────────────────────────────────────── 5.0.0
  │                                             │
  ├── 4.A.0 → 4.A.1 → 4.A.2 ──────────────────►─┤
  ├── 4.1.0 → 4.1.1 → 4.1.2 ──────────────────►─┤
  └── 4.2.0 → 4.2.1 ──────────────────────────►─┤
```

| Type | Pattern | Purpose |
|------|---------|---------|
| Checkpoint | X.0.0 | Stable snapshot, consolidates completed streams |
| Adhoc | X.A.I | Small fixes, always exists with checkpoint |
| Stream | X.N.I | Feature work, holds tasks |

## Workflow

1. **Create stream** → Define goal, scope, tasks
2. **Work** → Check off tasks as completed
3. **Iterate** → Bump version at milestones (4.1.0 → 4.1.1)
4. **Complete** → All tasks done, mark stream complete
5. **Consolidate** → Merge completed streams into new checkpoint

## Lifecycle

| State | Tags |
|-------|------|
| Active stream | `#inc/active`, `#ld/living` |
| Complete stream | `#inc/complete`, `#ld/dead` |
| Current checkpoint | `#inc/checkpoint`, `#ld/living` |
| Old checkpoint | `#inc/checkpoint`, `#ld/dead` |

# Dashboard

`(Dashboard) Increments.md` — Tracks all streams, their current iteration, and checkpoint history.

# Skills

| Skill | File | Purpose |
|-------|------|---------|
| Create | `sk-inc-create.md` | New stream with goal and tasks |
| Iterate | `sk-inc-iterate.md` | Bump version, log progress |
| Complete | `sk-inc-complete.md` | Mark stream done |
| Consolidate | `sk-inc-consolidate.md` | Create checkpoint from completed streams |
| Sync | `sk-inc-sync.md` | Update dashboard |
