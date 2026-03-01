# Plugin Template

This is a meta-plugin for creating new Flint plugins. Use it when you need to scaffold a new plugin that follows current conventions.

## Plugin Structure

Plugins are defined in the monorepo at `packages/flint-plugins/src/plugins/`. Each plugin has:

```
plugin-name/
├── plugin.yaml              # Manifest (required)
├── copy/                    # Files copied to Plugins/<Name>/
│   ├── init-<shorthand>.md  # Plugin context (required)
│   ├── meta-<shorthand>.md  # Metadata (optional)
│   ├── skills/              # Skill files
│   ├── templates/           # Template files
│   └── workflows/           # Workflow files
└── install/                 # Files installed to flint root (optional)
    └── *.md                 # Dashboard files, etc.
```

## Plugin Manifest (plugin.yaml)

```yaml
version: "1.0.0"           # Semver
name: Plugin Name          # Title Case display name
shorthand: pn              # 2-4 char identifier (used in file names)
description: Brief desc    # What the plugin does
type: prompt               # Always "prompt" for content plugins
depends:                   # Plugin shorthands this plugin requires
  - core
  - ld
install:                   # Files to install outside Plugins/ folder
  - source: (Dashboard) X.md
    dest: Mesh/(Dashboard) X.md
    install_mode: once     # 'once' or 'always' (default: always)
folders:                   # Directories to create in flint root
  - Mesh/MyFolder/
```

## File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Init | `init-<shorthand>.md` | `init-proj.md` |
| Meta | `meta-<shorthand>.md` | `meta-proj.md` |
| Skill | `sk-<shorthand>-<name>.md` | `sk-proj-archive_tasks.md` |
| Template | `tmp-<shorthand>-<name>.md` | `tmp-proj-task.md` |
| Workflow | `wkfl-<shorthand>-<name>.md` | `wkfl-proj-create_task.md` |

## Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| Create Plugin | `wkfl-tmpl-create_plugin.md` | Scaffold a new plugin |

## Templates

| Template | File | Purpose |
|----------|------|---------|
| Plugin YAML | `tmp-tmpl-plugin_yaml.md` | plugin.yaml manifest |
| Init File | `tmp-tmpl-init.md` | Plugin init file |
| Meta File | `tmp-tmpl-meta.md` | Plugin meta file |
| Skill | `tmp-tmpl-skill.md` | Skill file |
| Workflow | `tmp-tmpl-workflow.md` | Workflow file |
