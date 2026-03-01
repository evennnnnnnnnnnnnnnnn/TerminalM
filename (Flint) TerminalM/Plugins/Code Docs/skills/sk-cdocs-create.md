This skill belongs to the Code Docs plugin. Ensure you have @init-cdocs.md in context before continuing.

# Skill: Create

Create a new code documentation artifact.

# Input

- workspace: The workspace reference name (from Workspace folder)
- target: What to document (file path, directory path, or conceptual target)
- type: (optional) Primitive type - architecture, module, component, process, or feature

# Actions

1. Determine primitive type (if not provided)
   - Directory → Module
   - Single file with class/service → Component
   - Cross-cutting pattern → Architecture
   - Runtime flow → Process
   - User-facing behavior → Feature

2. Select template
   - `@tmp-cdocs-architecture` for architecture
   - `@tmp-cdocs-module` for module
   - `@tmp-cdocs-component` for component
   - `@tmp-cdocs-process` for process
   - `@tmp-cdocs-feature` for feature

3. Create doc directory if needed
   - `Mesh/Code Docs/<workspace>/`

4. Create doc file
   - Use naming: `(<Type>) <Name>.md`
   - Generate UUID for id
   - Set workspace field
   - Populate covers field based on target
   - Set last-sync to today's date

5. Read source code
   - Read the files/directories being documented
   - Analyze structure, exports, dependencies

6. Fill template sections
   - Purpose/Overview from code analysis
   - Structure from directory listing (for modules)
   - Interface from exports (for components)
   - Populate other sections based on code

7. Report creation
   - Confirm doc created
   - Show covers list
   - Note any sections that need human review

# Output

- New code doc artifact in `Mesh/Code Docs/<workspace>/`
- Covers field populated with documented paths
