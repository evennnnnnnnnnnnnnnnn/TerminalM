# Dead Code Analysis — TerminalM

**Date:** 2026-02-28
**Tools used:** knip, depcheck, manual analysis

---

## Summary

| Category | Count |
|----------|-------|
| Dead files (SAFE) | 4 |
| Unused exports (SAFE) | 2 |
| Stale non-source files (SAFE) | 3 |
| Unused dependencies | 0 (all false positives) |
| Build config cleanup | 4 entries |

---

## SAFE — Dead Files

These root-level files are explicitly marked `// DEPRECATED` and are leftover stubs from before the `src/` restructure. None are imported by any live code.

| File | Size | Status |
|------|------|--------|
| `preload.js` | 71 B | Deprecated stub — real file is `src/preload/preload.js` |
| `renderer.js` | 76 B | Deprecated stub — real file is `src/renderer/js/renderer.js` |
| `index.html` | 437 B | Deprecated stub — real file is `src/renderer/pages/terminal.html` |
| `styles.css` | 72 B | Deprecated stub — real file is `src/renderer/styles/` |

**Note:** `package.json` build config still lists these in `files[]`. They should be removed from both the filesystem AND the build config.

---

## SAFE — Unused Exports

| Export | File | Reason |
|--------|------|--------|
| `loadSession` | `src/main/session-state.js:108` | Only used internally; `main.js` only imports `setupSessionHandlers` |
| `saveSession` | `src/main/session-state.js:108` | Only used internally; `main.js` only imports `setupSessionHandlers` |

---

## SAFE — Stale Non-Source Files

| File | Size | Description |
|------|------|-------------|
| `Chat_Note_-_26_02_2026.md` | 5.2 KB | Development chat log, not part of source |
| `models.md` | 25 KB | Design notes for 3D models, not part of source |
| `generate_desk.py` | 13 KB | Blender script for generating desk model — asset already generated (`desk.glb` exists) |

These are development artifacts, not dead code. Flagged for awareness only — deletion is user discretion.

---

## FALSE POSITIVES — Dependencies

knip and depcheck flagged these as unused, but they are loaded via `<script>` tags in `terminal.html`, not `require()`:

| Dependency | How It's Used |
|------------|---------------|
| `@xterm/xterm` | `<script src="...node_modules/@xterm/xterm/lib/xterm.js">` |
| `@xterm/addon-fit` | `<script src="...node_modules/@xterm/addon-fit/lib/addon-fit.js">` |
| `@xterm/addon-search` | `<script src="...node_modules/@xterm/addon-search/lib/addon-search.js">` |
| `@xterm/addon-web-links` | `<script src="...node_modules/@xterm/addon-web-links/lib/addon-web-links.js">` |
| `@xterm/addon-webgl` | `<script src="...node_modules/@xterm/addon-webgl/lib/addon-webgl.js">` |
| `three` | Loaded via importmap in `terminal.html` |
| `@electron/rebuild` | Used in `npm run rebuild` script |

**All dependencies are in use.** No packages to remove.

---

## Build Config Cleanup

`package.json` `build.files[]` includes deprecated root stubs that should be removed:

```json
// CURRENT (includes dead files)
"files": [
  "main.js",
  "preload.js",      // DEAD
  "renderer.js",     // DEAD
  "styles.css",      // DEAD
  "index.html",      // DEAD
  "src/**/*",
  "node_modules/**/*"
]

// PROPOSED
"files": [
  "main.js",
  "src/**/*",
  "node_modules/**/*"
]
```

---

## Proposed Deletions

### Batch 1: Deprecated stubs + build config (SAFE)
1. Delete `preload.js`
2. Delete `renderer.js`
3. Delete `index.html`
4. Delete `styles.css`
5. Remove these 4 entries from `package.json` `build.files[]`

### Batch 2: Unused exports (SAFE)
6. Remove `loadSession` and `saveSession` from `module.exports` in `session-state.js`

### NOT proposed (user discretion):
- `Chat_Note_-_26_02_2026.md` — personal dev notes
- `models.md` — design reference
- `generate_desk.py` — asset generation script (may be needed again)
- `.env.swp` — vim swap file (likely stale)
