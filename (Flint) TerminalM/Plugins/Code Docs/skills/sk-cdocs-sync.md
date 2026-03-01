This skill belongs to the Code Docs plugin. Ensure you have @init-cdocs.md in context before continuing.

# Skill: Sync Session

Sync code documentation based on files modified during the current session.

# Input

- modified_files: List of file paths modified/created during this session (agent has session awareness)
- workspace: (optional) Specific workspace to check, otherwise checks the relevant ones. 

# Actions

## 1. Find Affected Docs

Run `flint codedocs referenced` with the modified files:

```bash
flint codedocs referenced path/to/file1.ts path/to/file2.ts ...
```

This returns all docs that have these files in their `covers:` list. Save this list of affected docs.

## 2. Check Coverage Gaps

For each modified file, check if it's covered by any doc:

```bash
flint codedocs coverage <workspace>
```

Identify files from the session that appear as "uncovered" in the coverage report.

## 3. Triage Updates

For each **affected doc** (from step 1):
- Read the doc
- Compare `last-sync` date with current date
- Determine if the doc content needs updating based on code changes
- If update needed, note it for step 5

## 4. Triage Coverage Gaps

For each **uncovered file** (from step 2):
- Examine the file's location and purpose
- Decide one of:
  - **Expand existing doc**: The file belongs in an existing Module/Architecture doc's scope → add to that doc's `covers:` list and update content
  - **Create new doc**: The file warrants its own doc (complex enough, distinct purpose) → create using appropriate primitive
  - **Skip**: The file is trivial (config, generated, etc.) and doesn't need documentation

This is a judgment call - match documentation depth to code complexity.

## 5. Execute Updates

For each doc needing update, use `@sk-cdocs-update`:
- Pass the doc path
- Note what changed in the code

## 6. Execute Creates/Expands

For uncovered files where you decided to act:
- **Expand**: Edit the existing doc to add the file to `covers:` and document it
- **Create**: Use `@sk-cdocs-create` with appropriate primitive type

## 7. Report Summary

Provide a summary:
- Docs updated: [list]
- Docs created: [list]
- Docs expanded: [list with files added]
- Files skipped: [list with reason]
- Files already covered: [count]

# Output

- Updated/created/expanded code docs
- Summary of all documentation changes made
