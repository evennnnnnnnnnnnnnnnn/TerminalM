# Projects Plugin

This plugin provides high-level planning and task management for Flint workspaces.

# Artifacts

- (Tasks) -> tmp-proj-task
	- Tasks describe a task specification and their implementation

# Interactions & Dependencies

- Living Documents Plugin
	- Uses living documents plugin to manage state
- Archive Plugin
	- Archive completed tasks, needs an archive type folder for tasks

# Interaction Guidelines

- All work and planning inside of a flint will be based on this plugin
- There can be add-on plugins such as sprints, planning
