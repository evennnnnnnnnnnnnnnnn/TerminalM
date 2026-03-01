# Filename: Mesh/Notepads/(Notepad) XXX [Topic Name].md

/* XXX is a 3-digit number like 001, 002, etc. */

```markdown
---
id: [generate-uuid]
tags:
  - "#notepad"
  - "#ntpd/notepad"
status: [active|archived]
artifacts-created:
  - [[leave empty until archived]]
template: tmp-ntpd-notepad
---

# Session Output

/* This section is added when archiving */

**Artifacts created:**
- [[artifact links]]
- (continue)

**Archived:** YYYY-MM-DD

---

[User writes here. Agent responds with blockquotes.]

> **Agent:** [Agent responds in blockquote format]

[Conversation continues...]
```

/* State Transitions:
   - active → archived: Replace status, add Session Output section, update #ld/living → #ld/dead
*/
