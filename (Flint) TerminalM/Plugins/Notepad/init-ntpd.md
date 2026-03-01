# Notepad Plugin

Document-based brainstorming. Individual notepad files for each topic with agent responses as blockquotes.

## Philosophy

**Persistent over ephemeral.** Chat disappears; notepads persist and can be referenced.

**Editable conversation.** Unlike chat, you can revise, reorganize, and refine.

**Distill and propagate.** When done, content flows to tasks, ideas, memories.

## How It Works

1. Start a notepad with a topic using `wkfl-ntpd-start`
2. User writes, agent responds with `> **Agent:**` blockquotes
3. Conversation continues in the notepad file
4. When done, run `wkfl-ntpd-finish` to extract artifacts and archive

## Notepad Lifecycle

```
active → archived
```

| Status | Meaning |
|--------|---------|
| `active` | Notepad in use for brainstorming |
| `archived` | Session complete, artifacts extracted |

## Response Format

```markdown
User writes their thoughts here.

> **Agent:** Agent responds in blockquote.

User adds more.

> **Agent:** Conversation continues.
```

## File Structure

- Location: `Mesh/Notepads/`
- Format: `(Notepad) XXX Topic Name.md` (XXX = 3-digit number)
- Dashboard: `(Dashboard) Notepads.md`

## Dashboards

| Dashboard | Purpose | Maintained By |
|-----------|---------|---------------|
| `(Dashboard) Notepads.md` | Track all notepads by state | DataviewJS |

## Skills

| Skill | File | Purpose |
|-------|------|---------|
| Respond | `sk-ntpd-respond.md` | Continue conversation |

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| Start | `wkfl-ntpd-start.md` | Create new notepad and begin conversation |
| Finish | `wkfl-ntpd-finish.md` | Archive notepad and extract artifacts |
