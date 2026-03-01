---
id: f9878410-3db8-450e-afdf-0390e0780b04
tags:
  - "#dashboard"
  - "#plan/dashboard"
  - "#managed/plugin/plan"
  - "#read-only"
---

```dataviewjs
function formatName(p) {
  return p.file.name.replace(/^\(Plan\)\s*/, '');
}

function statusIcon(status) {
  const icons = {
    'draft': '📝',
    'approved': '✅',
    'spent': '💫'
  };
  return icons[status] || '📝';
}

function statusOrder(status) {
  const order = { 'approved': 0, 'draft': 1 };
  return order[status] ?? 99;
}

// Only look in Mesh/Plans/
const plans = dv.pages('"Mesh/Plans"').where(p => p.file.path.includes('(Plan)'));

// Draft Plans
dv.header(1, "Draft");
const draft = plans.where(p => p.status === 'draft')
  .array().sort((a, b) => a.file.name.localeCompare(b.file.name));
if (draft.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Plan", "Meta-Task"],
    draft.map(p => [
      dv.fileLink(p.file.path, false, formatName(p)),
      p["meta-task"] ? p["meta-task"] : "—"
    ])
  );
}

// Approved Plans
dv.header(1, "Approved");
const approved = plans.where(p => p.status === 'approved')
  .array().sort((a, b) => a.file.name.localeCompare(b.file.name));
if (approved.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Plan", "Meta-Task"],
    approved.map(p => [
      dv.fileLink(p.file.path, false, formatName(p)),
      p["meta-task"] ? p["meta-task"] : "—"
    ])
  );
}

// Spent Plans
dv.header(1, "Spent");
const spent = plans.where(p => p.status === 'spent')
  .array().sort((a, b) => a.file.name.localeCompare(b.file.name));
if (spent.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Plan", "Realized Into"],
    spent.map(p => [
      dv.fileLink(p.file.path, false, formatName(p)),
      p["realized-into"] ? (Array.isArray(p["realized-into"]) ? p["realized-into"].join(", ") : p["realized-into"]) : "—"
    ])
  );
}
```
