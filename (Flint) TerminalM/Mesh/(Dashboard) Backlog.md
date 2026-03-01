---
id: bdcab568-4fae-4cdc-8d31-9618376078f9
tags:
  - "#dashboard"
  - "#proj/backlog"
  - "#managed/plugin/proj"
  - "#read-only"
---

```dataviewjs
function formatName(p) {
  return p.file.name.replace(/^\(Task\)\s*/, '');
}

function statusIcon(status) {
  const icons = {
    'draft': '📝',
    'todo': '⚪',
    'in-progress': '🔵',
    'review': '🔍',
    'done': '✅'
  };
  return icons[status] || '⚪';
}

function statusOrder(status) {
  const order = { 'review': 0, 'in-progress': 1, 'todo': 2, 'draft': 3 };
  return order[status] ?? 99;
}

function formatDate(d) {
  if (!d) return "—";
  return String(d).split('T')[0];
}

// Only look in Mesh/Tasks/
const tasks = dv.pages('#proj/task').where(p => p.file.path.startsWith('Mesh/Tasks/'));

// Review
dv.header(1, "Review");
const review = tasks.where(p => p.status === 'review')
  .array().sort((a, b) => {
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
  });
if (review.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Task", "Priority"],
    review.map(p => [dv.fileLink(p.file.path, false, formatName(p)), p.priority ?? "—"])
  );
}

// High Priority
dv.header(1, "High Priority");
const high = tasks.where(p => p.priority === 'high' && p.status !== 'done' && p.status !== 'review')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (high.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Task", "Status"],
    high.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// Medium Priority
dv.header(1, "Medium Priority");
const medium = tasks.where(p => p.priority === 'medium' && p.status !== 'done' && p.status !== 'review')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (medium.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Task", "Status"],
    medium.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// Low Priority
dv.header(1, "Low Priority");
const low = tasks.where(p => p.priority === 'low' && p.status !== 'done' && p.status !== 'review')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (low.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Task", "Status"],
    low.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// No Priority
dv.header(1, "No Priority");
const noPriority = tasks.where(p => !p.priority && p.status !== 'done' && p.status !== 'review')
  .array().sort((a, b) => statusOrder(a.status) - statusOrder(b.status));
if (noPriority.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Task", "Status"],
    noPriority.map(p => [dv.fileLink(p.file.path, false, formatName(p)), statusIcon(p.status) + ' ' + (p.status ?? "—")])
  );
}

// Recently Completed
dv.header(1, "Recently Completed");
const completed = tasks.where(p => p.status === 'done')
  .array().sort((a, b) => {
    const dateA = a.completed ? new Date(a.completed) : new Date(0);
    const dateB = b.completed ? new Date(b.completed) : new Date(0);
    return dateB - dateA;
  }).slice(0, 10);
if (completed.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Task", "Completed"],
    completed.map(p => [dv.fileLink(p.file.path, false, formatName(p)), formatDate(p.completed)])
  );
}
```
