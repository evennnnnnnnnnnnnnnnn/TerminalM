# Living Documents Plugin

Track document lifecycle. Living documents evolve; dead documents are frozen records.

## Tags

| Tag | Meaning |
|-----|---------|
| `#ld/living` | Actively maintained, updated as system changes |
| `#ld/dead` | Historical record, frozen in time |

## When to Use

**Living (`#ld/living`):**
- Architecture/design docs
- Dashboards and indexes
- Configuration and status docs
- Documents prefixed with `(System)` or `(Dashboard)`

**Dead (`#ld/dead`):**
- Meeting notes
- Completed increments
- Archived content
- Point-in-time snapshots

## Lifecycle

```
created → living → dead
              ↑
         (revived if needed)
```

Documents start living, become dead when superseded or completed.

# Skills

| Skill | File | Purpose |
|-------|------|---------|
| Sync | `sk-ld-sync.md` | Update living documents that have drifted |
