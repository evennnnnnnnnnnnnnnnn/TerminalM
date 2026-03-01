# Living Documents Plugin

Document lifecycle tracking via tags.

# Tags

| Tag | Meaning |
|-----|---------|
| `#ld/living` | Active, evolves with system |
| `#ld/dead` | Frozen, historical record |

# Dependencies

None (base plugin).

# Interaction Guidelines

- Other plugins use `#ld/living` and `#ld/dead` for lifecycle
- Streams must be `#ld/dead` before consolidation (Increments)
- Completed tasks marked `#ld/dead` before archival (Projects)
- Check `#ld/living` during sync to find updatable docs
