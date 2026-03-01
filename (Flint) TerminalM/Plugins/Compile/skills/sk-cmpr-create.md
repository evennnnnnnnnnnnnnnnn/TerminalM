# Skill: Create Compile

Create a new compile file - a curated collection of notes.

# Input

- Name: What to call this collection
- Description: Brief explanation of what this collection represents
- Links: List of notes to include

# Actions

1. Generate UUID for the file
2. Create file at `Mesh/(Compile) [Name].md` using @tmp-cmpr-compile
3. Fill in the description
4. Add all provided links under the `## Links` section

# Output

- New compile file in Mesh/
- Ready to use with `flint compile "(Compile) [Name]"`
