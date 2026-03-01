# Filename: plugin.yaml

Plugin manifest file. This file defines the plugin's metadata and installation behavior.

```yaml
version: "[semver version, e.g. 1.0.0]"
name: [Plugin Name in Title Case]
shorthand: [2-4 character identifier]
description: [Brief description of what the plugin does]
type: prompt
depends:
  - core
  - [other dependencies as shorthands]
  - (continue)

/* Optional: files to install outside Plugins/ folder */
install:
  - source: [filename in install/ folder]
    dest: [destination path from flint root]
    install_mode: [once|always] /* once = skip if already exists */
  - (continue)

/* Optional: folders to create in flint root */
folders:
  - [path from flint root]/
  - (continue)
```

## Notes

- `version`: Use semantic versioning (major.minor.patch)
- `name`: Title Case, used as display name and installed folder name
- `shorthand`: Lowercase, used in file names (init-X.md, sk-X-name.md)
- `type`: Always "prompt" for content plugins
- `depends`: List plugin shorthands, not names. Common: core, ld, arc
- `install`: Files from install/ folder copied to flint root
- `folders`: Created empty if they don't exist
