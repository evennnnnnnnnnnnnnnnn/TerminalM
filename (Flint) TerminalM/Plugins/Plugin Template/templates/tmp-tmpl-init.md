# Filename: init-[shorthand].md

Plugin context file. Loaded when the agent needs this plugin's capabilities.

```markdown
# [Plugin Name]

[1-2 sentence description of what this plugin provides]

## [Main Concept]

[Explain the core concept or model the plugin works with]

/* Include diagrams, tables, or examples as needed */

## Dashboards

/* If the plugin provides dashboards */

| Dashboard | Purpose | Maintained By |
|-----------|---------|---------------|
| `(Dashboard) [Name].md` | [what it shows] | [DataviewJS\|Manual\|Agent] |
| (continue) |

## Skills

| Skill | File | Purpose |
|-------|------|---------|
| [Skill Name] | `sk-[shorthand]-[name].md` | [what it does] |
| (continue) |

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| [Workflow Name] | `wkfl-[shorthand]-[name].md` | [what it does] |
| (continue) |

## Templates

/* If the plugin provides templates */

| Template | File | Purpose |
|----------|------|---------|
| [Template Name] | `tmp-[shorthand]-[name].md` | [what artifact it creates] |
| (continue) |
```

## Notes

- Keep init files focused on what agents need to know to use the plugin
- Include tables for quick reference of available skills/workflows/templates
- Explain any lifecycle or state management concepts
- Don't include implementation details (put those in meta file)
