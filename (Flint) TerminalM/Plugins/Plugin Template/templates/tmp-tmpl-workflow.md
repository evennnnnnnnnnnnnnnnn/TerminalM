# Filename: wkfl-[shorthand]-[name].md

Workflow files define multi-stage tasks with human checkpoints.

```markdown
This workflow belongs to the [Plugin Name] plugin. Ensure you have the @init-[shorthand].md in context before continuing.

# Workflow: [Workflow Name]

[Brief description of what this workflow accomplishes]

# Input

- [Required input 1]
- [Required input 2]
- (Optional) [Optional input]
- (continue)

# Actions

## Stage 1: [Stage Name]

- [Action or instruction]
- [Action or instruction]
- Once [condition], progress to the next stage

## Stage 2: [Stage Name]

- [Action or instruction]
- [Human checkpoint: review/approval]
- Once you receive confirmation from the user, progress to the next stage

## Stage 3: [Final Stage Name]

- [Final actions]
- [Update any state/status]
- (continue)

# Output

- [What the workflow produces]
- [Final state of artifacts]
```

## Notes

- Workflows have stages with human checkpoints between them
- Each stage should have a clear completion condition
- Use workflows when human review/approval is needed
- Reference skills for sub-tasks: @sk-[shorthand]-[name].md
- Reference templates for artifact creation: @tmp-[shorthand]-[name].md
