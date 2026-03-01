# Increments Plugin

Version-controlled work tracking through streams and checkpoints.

# Artifacts

| Type | Template | Description |
|------|----------|-------------|
| Stream | `tmp-inc-stream` | Work container with tasks (X.N.I) |
| Checkpoint | `tmp-inc-checkpoint` | Consolidation snapshot (X.0.0) |
| Adhoc | `tmp-inc-adhoc` | Small fixes stream (X.A.I) |
| Dashboard | `tmp-inc-dashboard` | Tracks all increments |
| Archive | `tmp-inc-archive` | Archive dashboard for old increments |

# Dependencies

| Plugin | Interaction |
|--------|-------------|
| `ld` | Lifecycle via `#ld/living` / `#ld/dead` |
| `arc` | Archive old checkpoints and streams |

# Archive Type

- Folder: `Media/Archive/Increments/`
- Dashboard: `tmp-inc-archive`
- Archives: Old checkpoints, completed streams after consolidation
