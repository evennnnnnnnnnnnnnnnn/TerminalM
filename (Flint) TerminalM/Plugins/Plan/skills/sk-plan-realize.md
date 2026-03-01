This skill belongs to the Plan plugin. Ensure you have @init-plan.md in context before continuing.

# Skill: Realize Plan

Convert an approved plan into downstream artifacts (specs, tasks, increments).

# Actions

1. Verify plan is in `approved` state
2. Read the plan's **Next Steps** section
3. For each next step, determine artifact type and create:
   - **Spec** → Create using Specs plugin (when available)
   - **Task** → Create using @wkfl-proj-create_task from Projects plugin
   - **Increment** → Create using @sk-inc-create from Increments plugin
4. Link each created artifact back to the source plan
5. Update **Next Steps** with links to created artifacts
6. Update plan state:
   - Replace `#ld/living` with `#ld/dead`
7. Mark the associated meta-task as complete `@sk-mtsk-complete`
