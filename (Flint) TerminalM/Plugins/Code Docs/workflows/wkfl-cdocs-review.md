This workflow belongs to the Code Docs plugin. Ensure you have @init-cdocs.md in context before continuing.

# Workflow: Review

Review coverage and systematically fill documentation gaps.

# Input

- workspace: Name of the workspace reference to review

# Actions

## Stage 1: Gather Current State

- Read all existing code docs in `Mesh/Code Docs/<workspace>/`
- Collect all `covers:` fields to build coverage map
- Run `flint codedocs coverage <workspace> --uncovered` if CLI available

## Stage 2: Identify Gaps

- List all source files in the workspace
- Compare against coverage map
- Categorize uncovered files:
  - **High priority**: Core business logic, entry points, public APIs
  - **Medium priority**: Utilities, helpers, internal modules
  - **Low priority**: Tests, configs, generated files

## Stage 3: Present Gaps to User

For each gap category, present:
- List of uncovered files/directories
- Suggested doc type (Module vs Component)
- Suggested groupings (multiple files → one Module doc)

Ask user:
- Which gaps to address now?
- Any to skip or defer?
- Any grouping preferences?

## Stage 4: Create Docs Interactively

For each selected gap:

1. Confirm doc type with user
2. Create doc using `@sk-cdocs-create`
3. Present doc for review
4. Apply user feedback
5. Move to next gap

## Stage 5: Summary Report

Present final state:

1. **Docs created this session:**
   - List of new docs

2. **Coverage improvement:**
   - Before: X files covered
   - After: Y files covered
   - Remaining gaps: Z files

3. **Stale docs detected:**
   - Docs with old `last-sync` dates
   - Recommend running `@sk-cdocs-update`

4. **Next steps:**
   - Remaining gaps to address
   - Schedule for next review

# Output

- New code docs created for selected gaps
- Coverage report
- Recommendations for future work
