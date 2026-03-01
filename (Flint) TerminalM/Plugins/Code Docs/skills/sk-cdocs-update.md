This skill belongs to the Code Docs plugin. Ensure you have @init-cdocs.md in context before continuing.

# Skill: Update

Update an existing code doc after code changes.

# Input

- doc: Path to the code doc to update, or the doc name
- reason: (optional) What changed in the code

# Actions

1. Read the existing doc
   - Parse frontmatter for covers list
   - Note current last-sync date

2. Read covered source files
   - Read all files/directories in the covers list
   - Compare against documented content

3. Identify changes
   - New exports/APIs not documented
   - Removed functionality still documented
   - Changed behavior or signatures
   - New files in covered directories

4. Update doc content
   - Update sections to reflect current code
   - Add new items (methods, files, etc.)
   - Remove references to deleted code
   - Revise descriptions if behavior changed

5. Update frontmatter
   - Set last-sync to today's date
   - Adjust covers list if scope changed

6. Report changes
   - Summarize what was updated
   - Note any significant changes
   - Flag if covers list changed

# Output

- Updated code doc
- last-sync field set to current date
