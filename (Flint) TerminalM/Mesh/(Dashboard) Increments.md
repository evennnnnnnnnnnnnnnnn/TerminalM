---
id: 636b1173-28f7-4436-ae30-eeb5474c8252
tags:
  - "#dashboard"
  - "#inc/dashboard"
  - "#managed/plugin/inc"
  - "#read-only"
---

```dataviewjs
// Parse version string to sortable number (e.g., "1.4.0" -> 10400, "1.A.0" -> 19900)
function parseVersion(v) {
  if (!v) return 0;
  const parts = String(v).split('.');
  const major = parseInt(parts[0]) || 0;
  const minor = parts[1] === 'A' ? 99 : (parseInt(parts[1]) || 0);
  const patch = parseInt(parts[2]) || 0;
  return major * 10000 + minor * 100 + patch;
}

function sortByVersion(pages, desc = false) {
  return pages.array().sort((a, b) => {
    const av = parseVersion(a.iteration);
    const bv = parseVersion(b.iteration);
    return desc ? bv - av : av - bv;
  });
}

function formatName(p) {
  return p.file.name.replace(/^\(Increment\)\s*/, '');
}

// Only look in Mesh/ folder
const meshPages = (tag) => dv.pages(tag).where(p => p.file.path.startsWith('Mesh/'));

// Current Checkpoint
dv.header(1, "Current Checkpoint");
const checkpoints = meshPages('#inc/checkpoint').array();
if (checkpoints.length > 0) {
  const current = checkpoints[0];
  dv.paragraph(dv.fileLink(current.file.path, false, current.file.name.replace(/^\(Increment\)\s*/, '')));
} else {
  dv.paragraph("*No checkpoints found*");
}

// Active Streams
dv.header(1, "Active Streams");
const active = sortByVersion(
  meshPages('#inc/stream').where(p => p.status === 'active')
);
if (active.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Stream", "Iteration"],
    active.map(p => [dv.fileLink(p.file.path, false, formatName(p)), p.iteration ?? "—"])
  );
}

// Deferred
dv.header(1, "Deferred");
const deferred = sortByVersion(
  meshPages('#inc/stream').where(p => p.status === 'deferred')
);
if (deferred.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Stream", "Iteration"],
    deferred.map(p => [dv.fileLink(p.file.path, false, formatName(p)), p.iteration ?? "—"])
  );
}

// Recently Completed Streams
dv.header(1, "Recently Completed Streams");
const complete = sortByVersion(
  meshPages('#inc/stream').where(p => p.status === 'completed'),
  true
).slice(0, 10);
if (complete.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.table(["Stream", "Iteration"],
    complete.map(p => [dv.fileLink(p.file.path, false, formatName(p)), p.iteration ?? "—"])
  );
}

// Checkpoint History
dv.header(1, "Checkpoint History");
if (checkpoints.length === 0) {
  dv.paragraph("*None*");
} else {
  dv.list(checkpoints.map(p =>
    dv.fileLink(p.file.path, false, p.file.name.replace(/^\(Increment\)\s*/, ''))
  ));
}
```
