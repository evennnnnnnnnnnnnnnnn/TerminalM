This workflow belongs to the Plugin Template plugin. Ensure you have the @init-tmpl.md in context before continuing.

# Workflow: Create Plugin

Scaffold a new Flint plugin in the monorepo.

# Input

- Plugin name and purpose
- Desired shorthand (2-4 characters)
- Dependencies (other plugins this plugin requires)
- What artifacts/templates it will provide

# Actions

## Stage 1: Plugin Design

- Confirm the plugin name, shorthand, and purpose with the user
- Determine what files the plugin needs:
  - Does it need install files (dashboards, etc.)?
  - Does it need folders created?
  - What skills and workflows will it provide?
  - What templates will it provide?
- Once design is confirmed, progress to the next stage

## Stage 2: Create Plugin Structure

Create the plugin in `/packages/flint-plugins/src/plugins/<plugin-name>/`:

1. Create `plugin.yaml` using @tmp-tmpl-plugin_yaml template
2. Create `copy/init-<shorthand>.md` using @tmp-tmpl-init template
3. Create `copy/meta-<shorthand>.md` using @tmp-tmpl-meta template (if needed)
4. Create skill files in `copy/skills/` using @tmp-tmpl-skill template
5. Create workflow files in `copy/workflows/` using @tmp-tmpl-workflow template
6. Create template files in `copy/templates/`
7. Create install files in `install/` if needed

## Stage 3: Verify Plugin

- Verify the plugin structure is complete
- Check that all file references in plugin.yaml are correct
- Confirm with user that the plugin is ready
- Inform user to run `flint plugin install <shorthand>` to test

# Output

- Complete plugin scaffold in monorepo
- Plugin ready for installation and testing
