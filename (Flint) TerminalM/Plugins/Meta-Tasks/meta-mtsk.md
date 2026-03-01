# Meta-Tasks Plugin

Higher-order goals achieved through completion of referenced artifacts.

# Artifacts

- (Meta-Task) -> tpl-mtsk-meta_task
  - Meta-tasks track higher-order outcomes

# Interactions & Dependencies

- Projects Plugin
  - Meta-tasks can track completion of task sets
  - Complementary: tasks are units, meta-tasks are goals
- Workspace Plugin
  - Meta-tasks can track workspace completion
  - Example: "Complete Workspace 009" achieved when workspace status = completed
- Increments Plugin
  - Meta-tasks can track increment shipping
  - Example: "Ship 12.2.0" achieved when increment marked complete
- Living Documents Plugin
  - Uses ld tags for meta-task lifecycle (#ld/living → #ld/dead)

# Interaction Guidelines

- Meta-tasks are thin — they reference, not duplicate
- Completion is computed from target states, not manual
- One meta-task per high-level goal
- Can nest: meta-task can reference other meta-tasks
