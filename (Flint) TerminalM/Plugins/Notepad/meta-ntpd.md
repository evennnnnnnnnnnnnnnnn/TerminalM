# Notepad Plugin

Document-based brainstorming with individual notepad files.

## Artifacts

| Type | Template | Description |
|------|----------|-------------|
| Notepad | `tmp-ntpd-notepad` | Individual brainstorming document |

## File Structure

```
Mesh/Notepads/
├── (Dashboard) Notepads.md
├── (Notepad) 001 API Design.md
├── (Notepad) 002 Auth Flow.md
└── ...
```

## Dependencies

| Plugin | Interaction |
|--------|-------------|
| `ids` | Propagate ideas (optional) |
| `proj` | Create tasks from specs (optional) |
| `arc` | Archive completed notepads |

## Tags

| Tag | Purpose |
|-----|---------|
| `#notepad` | All notepad artifacts |
| `#ntpd/notepad` | Notepad documents |
| `#ntpd/dashboard` | Notepad dashboard |
