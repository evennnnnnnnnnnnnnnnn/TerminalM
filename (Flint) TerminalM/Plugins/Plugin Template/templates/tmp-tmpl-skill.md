# Filename: sk-[shorthand]-[name].md

Skill files define focused, single-purpose tasks.

```markdown
This skill belongs to the [Plugin Name] plugin. Ensure you have the @init-[shorthand].md in context before continuing.

# Skill: [Skill Name]

[Brief description of what this skill does]

# Input

- [Required input 1]
- [Required input 2]
- (Optional) [Optional input]
- (continue)

# Actions

[Step-by-step instructions for completing the skill]

1. [First action]
2. [Second action]
3. (continue)

/* Use sub-lists for detailed instructions */
/* Reference templates with @tmp-[shorthand]-[name].md */
/* Reference other skills with @sk-[shorthand]-[name].md */

# Output

- [What the skill produces]
- [Any side effects or state changes]
```

## Notes

- Skills are atomic operations, not multi-stage workflows
- If a task requires human review/approval, use a workflow instead
- Always reference the init file at the top
- Keep actions clear and sequential
