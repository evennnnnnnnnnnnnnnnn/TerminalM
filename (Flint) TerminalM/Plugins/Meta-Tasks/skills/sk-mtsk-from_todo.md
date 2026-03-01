This skill belongs to the Meta-Tasks plugin. Ensure you have @init-mtsk.md in context before continuing.

# Skill: From Todo

Convert todo items into meta-tasks.

# Actions

1. For each todo item:
   - Create `(Meta-Task) [Todo Name].md` using @tpl-mtsk-meta_task
   - Set condition: `when: [[Task]] is done` (task to be created later)
   - Add deadline if mentioned in todo
2. Add all created meta-tasks to `(Dashboard) Meta-Backlog.md`
