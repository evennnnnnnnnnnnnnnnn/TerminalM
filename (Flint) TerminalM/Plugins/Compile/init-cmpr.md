# Compiler Plugin

Create curated collections of notes that can be compiled together using `flint compile`.

## Philosophy

**Compile files are aggregates.** They collect related notes into a single manifest that can be flattened with the compile command.

**Explicit over automatic.** Rather than following hyperlinks recursively, Compile files explicitly list what should be included. This gives precise control over compiled output.

**Compile files are just markdown.** A `(Compile)` file is a normal note with a description and a list of hyperlinks. The `flint compile` command treats it like any other note.

## Key Concepts

### Compile File

A markdown file with the `(Compile)` prefix that serves as an aggregate manifest. Contains:
- Brief description of what this collection represents
- List of hyperlinks to include when compiled

When you run `flint compile "(Compile) Name"`, it collects the source file plus all its direct links (at depth 1 by default).

## Skills

| Skill | File | Purpose |
|-------|------|---------|
| Create | `sk-cmpr-create.md` | Create a new compile file with links |
| Add | `sk-cmpr-add.md` | Add links to an existing compile file |

## Templates

| Template | File | Purpose |
|----------|------|---------|
| Compile | `tmp-cmpr-compile.md` | Structure for compile files |

## Usage Examples

**Create a compile file for all architecture docs:**
```
@sk-cmpr-create with name "Architecture Bundle" and links to architecture notes
```

**Add more links to existing compile:**
```
@sk-cmpr-add to "(Compile) Architecture Bundle" with [[New Doc]]
```

**Compile to clipboard:**
```bash
flint compile "(Compile) Architecture Bundle"
```

**Compile to export:**
```bash
flint compile "(Compile) Architecture Bundle" --export arch-bundle
```
