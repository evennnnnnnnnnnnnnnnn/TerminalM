This workflow belongs to the Notepad plugin. Ensure you have @init-ntpd.md in context before continuing.

# Workflow: Finish Notepad

End a notepad session by extracting artifacts and archiving.

# Input

- The notepad to finish

# Actions

## Stage 1: Review Content

1. Read the notepad
2. Identify extractable items:

| Type | Destination | Format |
|------|-------------|--------|
| Tasks/specs | `(Task) Name.md` | Links back to notepad |
| Ideas | Ideas Board | With notepad reference |
| Decisions/facts | Memories (if exists) | With notepad reference |
| Others | Any | Whatever fits |

## Stage 2: Draft Artifacts

1. Create draft artifacts with references back to the notepad
2. Add Session Output section to the notepad at the top:

```markdown
---

# Session Output

**Artifacts created:**
- [[(Task) ...]] - description
- Added to Ideas Board: ...
- (continue)

**Archived:** YYYY-MM-DD
```

3. Present to user for review and confirmation

## Stage 3: Archive

1. Update notepad status to `archived`
2. Update tags: `#ld/living` → `#ld/dead`
3. Populate `artifacts-created` field in frontmatter
4. Report what was created and archived

# Output

- Archived notepad with Session Output summary
- New artifacts referencing the notepad
- Dashboard updated automatically via dataview
