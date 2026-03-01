# Plan Plugin

High-level planning that maps to human intention, upstream of all other work artifacts.

# Artifacts

- Plan → tmp-plan-plan
  - Represents a planning session with goal, context, approach, and next steps
- Dashboard → tmp-plan-dashboard
  - Tracks all plans by state (active, spent)

# Interactions & Dependencies

- Projects Plugin (optional)
  - Plans can be realized into tasks via @wkfl-proj-create_task
- Increments Plugin (optional)
  - Plans can spawn increments via @sk-inc-create

# Interaction Guidelines

- Plans are upstream of all other artifacts — they capture human intent
- When creating tasks/specs/increments, link back to source plan in Context section
- Check for existing plans before starting new work to avoid duplication
- Plans should be realized (spent) before archiving, not abandoned
