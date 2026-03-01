---
id: 92d02478-82b6-4186-95d1-ccbe065c0455
tags:
  - "#dashboard"
  - "#ntpd/dashboard"
  - "#managed/plugin/ntpd"
  - "#read-only"
---

```dataviewjs
function formatName(p) {
  return p.file.name.replace(/^\(Notepad\)\s*/, '');
}

// Only look in Mesh/Notepads/
const notepads = dv.pages('#ntpd/notepad').where(p => p.file.path.startsWith('Mesh/Notepads/'));

// Active Notepads
dv.header(1, "Active");
const active = notepads.where(p => p.status === 'active')
  .array().sort((a, b) => b.file.name.localeCompare(a.file.name));
if (active.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Notepad", "Topic"],
    active.map(p => [
      dv.fileLink(p.file.path, false, formatName(p)),
      p.topic ?? "—"
    ])
  );
}

// Archived Notepads
dv.header(1, "Archived");
const archived = notepads.where(p => p.status === 'archived')
  .array().sort((a, b) => b.file.name.localeCompare(a.file.name));
if (archived.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Notepad", "Topic", "Artifacts"],
    archived.map(p => [
      dv.fileLink(p.file.path, false, formatName(p)),
      p.topic ?? "—",
      p["artifacts-created"] ? (Array.isArray(p["artifacts-created"]) ? p["artifacts-created"].join(", ") : p["artifacts-created"]) : "—"
    ])
  );
}
```
