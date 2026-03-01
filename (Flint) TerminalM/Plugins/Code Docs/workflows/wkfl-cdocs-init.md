This workflow belongs to the Code Docs plugin. Ensure you have @init-cdocs.md in context before continuing.

# Workflow: Init

Initialize code documentation for a workspace.

# Input

- workspace: Name of the workspace reference to document

# Actions

## Stage 1: Verify Workspace

- Confirm workspace exists in `Workspace/` folder
- Read workspace to understand the codebase structure
- Identify the root directory and key entry points

## Stage 2: Create Folder Structure

- Create `Mesh/Code Docs/<workspace>/` directory
- Run `flint codedocs init <workspace>` if CLI is available

## Stage 3: Initial Architecture Doc

- Create initial Architecture doc using `@sk-cdocs-create`
- Focus on high-level system overview
- Cover the root directory
- Document:
  - Overall purpose of the codebase
  - Major subsystems/layers
  - Key technologies used
  - Entry points

## Stage 4: Survey Codebase

- List top-level directories
- Identify which are worth dedicated Module docs
- Identify complex files worth Component docs
- Note any obvious processes or features

## Stage 5: Report and Plan

Present to user:

1. **Created:**
   - Architecture doc with initial overview

2. **Recommended next docs:**
   - Module docs for key directories
   - Component docs for complex files
   - Process docs for major flows

3. **Coverage status:**
   - What's covered by the Architecture doc
   - Gaps remaining

4. **Next steps:**
   - Use `@wkfl-cdocs-review` to systematically fill gaps
   - Or use `@sk-cdocs-create` to add specific docs

# Output

- Code Docs folder initialized
- Architecture doc created
- Roadmap for further documentation
