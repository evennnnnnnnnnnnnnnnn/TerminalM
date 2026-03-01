---
id: f44a7347-5fa2-4880-9e91-39b8baeff97f
tags:
  - "#dashboard"
  - "#mtsk/backlog"
  - "#managed/plugin/mtsk"
  - "#read-only"
---

```dataviewjs
function formatName(p) {
  return p.file.name.replace(/^\(Meta-Task\)\s*/, '');
}

function statusIcon(status) {
  const icons = {
    'draft': '📝',
    'todo': '⚪',
    'in-progress': '🔵',
    'done': '✅'
  };
  return icons[status] || '⚪';
}

function statusOrder(status) {
  const order = { 'in-progress': 0, 'todo': 1, 'draft': 2 };
  return order[status] ?? 99;
}

// Only look in Mesh/Meta-Tasks/
const tasks = dv.pages('#mtsk/meta-task').where(p => p.file.path.startsWith('Mesh/Meta-Tasks/'));

// High Priority
dv.header(1, "High Priority");
const high = tasks.where(p => p.priority === 'high' && p.status !== 'done')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (high.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Meta-Task", "Status"],
    high.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// Medium Priority
dv.header(1, "Medium Priority");
const medium = tasks.where(p => p.priority === 'medium' && p.status !== 'done')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (medium.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Meta-Task", "Status"],
    medium.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// Low Priority
dv.header(1, "Low Priority");
const low = tasks.where(p => p.priority === 'low' && p.status !== 'done')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (low.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Meta-Task", "Status"],
    low.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// No Priority
dv.header(1, "No Priority");
const noPriority = tasks.where(p => !p.priority && p.status !== 'done')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (noPriority.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Meta-Task", "Status"],
    noPriority.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// Recently Completed
dv.header(1, "Recently Completed");
function formatDate(d) {
  if (!d) return "—";
  return String(d).split('T')[0];
}
const completed = tasks.where(p => p.status === 'done')
  .array().sort((a, b) => {
    const dateA = a.completed ? new Date(a.completed) : new Date(0);
    const dateB = b.completed ? new Date(b.completed) : new Date(0);
    return dateB - dateA;
  }).slice(0, 10);
if (completed.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Meta-Task", "Completed"],
    completed.map(p => [dv.fileLink(p.file.path, false, formatName(p)), formatDate(p.completed)])
  );
}
```
