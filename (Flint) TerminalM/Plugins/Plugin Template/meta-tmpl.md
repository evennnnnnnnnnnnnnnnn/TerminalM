# Plugin Template

Meta-plugin for creating new Flint plugins.

# Artifacts

- Plugins -> Uses all tmp-tmpl-* templates
  - Creates complete plugin scaffolds in the monorepo

# Interactions & Dependencies

- Core Plugin
  - Follows conventions defined in core

# Interaction Guidelines

- This plugin operates on the monorepo codebase, not the flint's Plugins/ folder
- Generated plugins should be installed via `flint plugin install <shorthand>`
- Always use existing plugins as reference when creating new ones
