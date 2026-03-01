# Upgrade Flint

Upgrade this flint to the latest version by reading and applying migration documents.

## Step 1: Check Version Status

Run `flint upgrade --status` to see:
- Current flintVersion
- Latest available version
- Available migrations

If already up to date, inform user and stop.

## Step 2: Download Migrations

Run `flint upgrade` to download migration documents to `.flint/flint/migrations/`.

## Step 3: Read Migration Documents

For each migration (in order from oldest to newest):

1. Read `.flint/flint/migrations/<from>-to-<to>/migration.md`
2. Understand:
   - What changed
   - What actions are required
   - What files are affected

## Step 4: Apply Changes

For each migration document:

1. Follow the **Breaking Changes** section - these are required
2. Apply each action described
3. Run any suggested verification commands
4. If optional scripts are provided and helpful, run them

## Step 5: Update Version

After all migrations are applied:

1. Edit `.flint/flint.config.yaml`
2. Update `flintVersion` to the new version
3. Save the file

## Step 6: Verify

Run these checks:
- `flint list` - should show this flint
- `flint plugin list` - should work without errors
- Check that any breaking changes were resolved

## Step 7: Report

Tell the user:
- Previous version
- New version
- Summary of changes applied
- Any manual steps they may need to take

## Example Session

```
User: Upgrade this flint

Agent: Let me check the version status.

*runs flint upgrade --status*

You're on 1.0.0, latest is 1.2.0. Two migrations available.

*runs flint upgrade*

Downloaded migration docs. Let me read and apply them.

*reads .flint/flint/migrations/1.0.0-to-1.1.0/migration.md*

This migration removes the modules field. Let me check your config...

*edits .flint/flint.config.yaml*

Done. Now for 1.1.0 to 1.2.0...

*reads .flint/flint/migrations/1.1.0-to-1.2.0/migration.md*

This adds git integration. Already have .gitignore, looks good.

*updates flintVersion to 1.2.0*

Upgraded from 1.0.0 → 1.2.0. Changes applied:
- Removed deprecated modules field
- Verified git setup

Your flint is now up to date.
```
