# Filename: meta-[shorthand].md

Plugin metadata file. Contains implementation details for plugin interop.

```markdown
# [Plugin Name]

[Brief description]

# Artifacts

- [Artifact Type] -> [template name]
  - [Description of what this artifact represents]
- (continue)

# Interactions & Dependencies

- [Dependency Plugin Name]
  - [How this plugin uses/interacts with the dependency]
- (continue)

# Interaction Guidelines

- [Guideline about when/how to use this plugin]
- [Guideline about what this plugin should/shouldn't do]
- (continue)
```

## Notes

- Meta files are for plugin-to-plugin interaction details
- Document what artifacts the plugin produces and their templates
- Explain how this plugin relates to its dependencies
- Include guidelines that help agents decide when to use this plugin
