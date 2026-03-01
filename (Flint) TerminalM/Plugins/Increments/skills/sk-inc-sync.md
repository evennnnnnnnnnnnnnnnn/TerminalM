# Skill: Sync Dashboard

Update Increments dashboard from increment documents.

# Actions

1. Find all `#increment` documents
2. Extract: version, name, status, current iteration
3. Group streams by checkpoint
4. Update @"(Dashboard) Increments.md":
   - Current checkpoint with streams and iterations
   - Checkpoint history
5. Report changes
