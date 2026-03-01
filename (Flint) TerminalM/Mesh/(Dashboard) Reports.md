---
id: 20a9e083-6fb5-4f66-89af-356985587739
tags:
  - "#dashboard"
  - "#rpt/dashboard"
  - "#ld/living"
template: tmp-rpt-dashboard
---

# Reports

```dataviewjs
const reports = dv.pages('"Mesh/Reports"')
  .where(p => p.tags && p.tags.includes("#rpt/report"))
  .sort(p => p["date-created"], "desc");

const active = reports.where(p => p.status === "active");
const consumed = reports.where(p => p.status === "consumed");

if (active.length > 0) {
  dv.header(2, "Active");
  dv.table(
    ["Report", "Created"],
    active.map(p => [p.file.link, p["date-created"]])
  );
}

if (consumed.length > 0) {
  dv.header(2, "Consumed");
  dv.table(
    ["Report", "Created"],
    consumed.slice(0, 10).map(p => [p.file.link, p["date-created"]])
  );
}

if (reports.length === 0) {
  dv.paragraph("*No reports yet. Use `wkfl-rpt-create` to create one.*");
}
```
