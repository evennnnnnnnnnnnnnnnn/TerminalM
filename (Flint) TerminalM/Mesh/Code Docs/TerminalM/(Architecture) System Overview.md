---
id: e91bb143-4be8-456b-b3c4-aee20dab57ba
tags:
  - "#code-docs"
  - "#code-docs/architecture"
  - "#ld/living"
workspace: TerminalM
covers:
  - main.js
  - package.json
  - src/main/
  - src/preload/
  - src/renderer/
last-sync: 2026-02-28
template: tmp-cdocs-architecture
---

# System Overview

## Overview

TerminalM is an Electron-based terminal emulator that provides a modern, tabbed terminal experience with split panes, session persistence, and a Catppuccin theme. It wraps real system shells (PowerShell, bash, zsh, fish) via `node-pty` and renders them using `xterm.js` with WebGL acceleration. The app targets Windows primarily (with macOS support) and ships via `electron-builder` with GitHub-based auto-updates.

## Key Concepts

| Concept | Description |
|---------|-------------|
| Pane Tree | Each tab has a tree of panes — leaf nodes are terminals, internal nodes are horizontal/vertical splits, enabling arbitrary nesting |
| PTY Process | Real pseudo-terminal processes managed by `node-pty` in the main process, bridged to the renderer via IPC |
| Session Persistence | Tab layout, CWD, and terminal buffer content survive app restarts via JSON + `.buf` files in `userData` |
| CWD Tracking | Shells emit OSC 7/OSC 9;9 escape sequences to report the current directory back to the app |
| Process Detection | Regex patterns match terminal output to detect running processes (git, node, docker, etc.) for UI hints |
| Broadcast Mode | Sends keystrokes to all active panes simultaneously |
| Playground | A 3D virtual office (Three.js) where each terminal spawns a character at a desk |

## Design Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| Electron + node-pty | Full native shell access with cross-platform GUI | Tauri (no native PTY), web-only (no shell access) |
| xterm.js with WebGL addon | GPU-accelerated rendering for smooth terminal output | Canvas renderer (slower), DOM-based (much slower) |
| Single monolithic renderer.js | All UI logic in one file for simplicity in early development | Module system, framework-based components |
| Catppuccin Mocha/Latte themes | Aesthetic, widely-loved color scheme with both dark and light variants | Custom themes, Dracula, Nord |
| EncodedCommand for PowerShell | Avoids all quoting/escaping issues when injecting OSC prompt functions | -Command with manual escaping (fragile) |
| Separate userData for dev | `-dev` suffix prevents dev builds from corrupting production session data | Shared data (risky), env-based config |

## Patterns

### IPC Bridge (Preload)

All communication between main and renderer goes through `contextBridge.exposeInMainWorld('termAPI', {...})`. The preload script defines a strict API surface — no `nodeIntegration`, full `contextIsolation`. Patterns used:
- `ipcRenderer.invoke()` for request/response (pty-create, session-load)
- `ipcRenderer.send()` for fire-and-forget (pty-write, pty-resize)
- `ipcRenderer.sendSync()` for critical saves during `beforeunload`
- `ipcRenderer.on()` wrapped with cleanup returns for event listeners

### State Management

All UI state lives in plain Maps and variables in `renderer.js`:
- `tabs` Map — tab metadata (label, pane tree, shell, color, folder, cwd, lock status)
- `folders` Map — folder metadata (label, collapsed state, child tab IDs)
- `tabOrder` array — ordered list of `{type, id}` for rendering
- `panes` Map — pane node references
- `settings` object — merged from `SETTINGS_DEFAULTS` + localStorage

### Debounced Persistence

Window state and session state use debounced saves to avoid excessive disk writes:
- Window position/size: 300ms debounce on resize/move, immediate on close
- Session state: periodic timer + sync save on `beforeunload`

## Components

- Main Process (`main.js`) — App lifecycle, window creation, auto-updater, IPC handlers
- PTY Manager (`src/main/pty-manager.js`) — Spawns and manages terminal processes, CWD parsing
- Shell Config (`src/main/shell.js`) — Shell detection (pwsh > PowerShell) and argument building
- Window State (`src/main/window-state.js`) — Persists window bounds to JSON
- Session State (`src/main/session-state.js`) — Persists tab layout and terminal buffers
- Menu (`src/main/menu.js`) — Native application menu with keyboard shortcuts
- Preload (`src/preload/preload.js`) — Secure IPC bridge (`termAPI`)
- Renderer (`src/renderer/js/renderer.js`) — All UI: tabs, panes, search, command palette, settings, themes
- Playground 3D (`src/renderer/js/playground-3d.js`) — Three.js virtual office scene
- HTML Shell (`src/renderer/pages/terminal.html`) — Page structure, dialogs, context menus, settings panel

## Cross-Cutting Concerns

- **Error handling**: Silent `try/catch` blocks around file I/O and PTY operations — failures are swallowed to prevent crashes
- **Security**: `contextIsolation: true`, `nodeIntegration: false`, all IPC through explicit preload API
- **Theming**: CSS custom properties in `variables.css` toggled via `data-theme` attribute on `<html>`, with corresponding xterm.js theme objects in renderer
- **Platform adaptation**: Conditional titlebar styles (hidden + overlay on Windows, hiddenInset + traffic lights on macOS), shell detection per platform

## Diagrams

```
┌─────────────────────────────────────────────────┐
│                  Main Process                    │
│                                                  │
│  main.js ─── window-state.js                     │
│    │                                             │
│    ├── pty-manager.js ── shell.js                │
│    │       │                                     │
│    │    node-pty (PTY processes)                  │
│    │                                             │
│    ├── session-state.js                          │
│    │       │                                     │
│    │    userData/ (JSON + .buf files)             │
│    │                                             │
│    └── menu.js                                   │
│                                                  │
├──────────── IPC (contextBridge) ─────────────────┤
│                                                  │
│  preload.js → termAPI                            │
│                                                  │
├──────────────────────────────────────────────────┤
│                Renderer Process                   │
│                                                  │
│  terminal.html                                   │
│    ├── renderer.js (tabs, panes, UI)             │
│    ├── playground-3d.js (Three.js)               │
│    ├── xterm.js + addons (WebGL, fit, search)    │
│    └── styles/ (CSS modules)                     │
└─────────────────────────────────────────────────┘
```

## Related

- Future Module docs for `src/main/` and `src/renderer/`
- Future Process docs for PTY lifecycle and session restore
- Future Feature docs for tabs, split panes, command palette
