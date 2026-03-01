# Core Plugin

Base plugin system and terminal agent conventions for all Flint agents.

## Skills

| Skill | Purpose |
|-------|---------|
| sk-core-upgrade | Upgrade flint to latest version via migrations |

## Interactions & Dependencies

- No dependencies (base plugin)
- All other plugins depend on Core
- Loaded first before any other plugin

## Interaction Guidelines

- Provides plugin file conventions (init, meta, sk, wkfl, tpl)
- Defines terminal agent operating principles
- Read Flint Init before starting any work
- Plugin loading is on-demand, not all at once
