This skill belongs to the Plan plugin. Ensure you have @init-plan.md in context before continuing.

# Skill: Refine Plan

Continue refining an active plan based on new input from conversation.

# Actions

1. Read the current plan document
2. Identify which sections need updates based on user input:
   - New context → update **Context**
   - Changed direction → update **Approach**
   - Answered question → move from **Open Questions** to **Decisions**
   - New unknowns → add to **Open Questions**
   - Scope changes → update **Goal** or **Next Steps**
3. Edit the plan document directly with changes
4. If significant new direction, optionally spawn research agents to gather more context
5. Summarize what changed to the user
