# Multi Terminal

A modern Electron-based terminal emulator with tabs, split panes, search, and a Catppuccin Mocha theme.

## Features

- **Tabs** — Create, close, drag-and-drop reorder, double-click to rename
- **Split panes** — Split horizontally or vertically, with resizable dividers
- **Search** — Find text in the active terminal (Ctrl+Shift+F)
- **Real PTY** — Runs your actual shell (PowerShell/bash/zsh/fish)
- **Catppuccin Mocha theme** — Full 16-color palette
- **WebGL rendering** — GPU-accelerated terminal output
- **Zoom** — Per-session font size control
- **Pane navigation** — Alt+Arrow keys to move between panes
- **Window state** — Remembers position and size across sessions
- **Cross-platform titlebar** — Native controls on Windows, traffic lights on macOS

## Setup

```bash
npm install
npm start
```

If `node-pty` fails to load, rebuild it for Electron:

```bash
npx @electron/rebuild
```

If rebuild fails (no Visual Studio Build Tools on Windows):

```bash
# Option A: Install build tools
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
npx @electron/rebuild

# Option B: Use prebuilt binaries
npm uninstall node-pty
npm install node-pty-prebuilt-multiarch
```

## Keyboard Shortcuts

| Action             | Shortcut              |
|--------------------|-----------------------|
| New Tab            | Ctrl/Cmd + T          |
| Close Pane/Tab     | Ctrl/Cmd + W          |
| Split Right        | Ctrl/Cmd + Shift + D  |
| Split Down         | Ctrl/Cmd + Shift + E  |
| Find               | Ctrl/Cmd + Shift + F  |
| Switch Tab 1-9     | Ctrl/Cmd + 1-9        |
| Navigate Panes     | Alt + Left/Right      |
| Zoom In            | Ctrl/Cmd + =          |
| Zoom Out           | Ctrl/Cmd + -          |
| Reset Zoom         | Ctrl/Cmd + 0          |
| Copy               | Ctrl/Cmd + C          |
| Paste              | Ctrl/Cmd + V          |

## Architecture

```
main.js       — Electron main process, PTY management, window state
preload.js    — Secure IPC bridge
index.html    — Minimal HTML shell with script/style includes
renderer.js   — Tab, pane, search, and UI logic
styles.css    — Complete Catppuccin-themed styling
```

The app uses a tree-based pane model. Each tab has a pane tree where leaf nodes are terminals and internal nodes are splits, allowing arbitrary nesting.

## Customization

- **Theme**: Edit CSS variables in `styles.css` and the `THEME` object in `renderer.js`
- **Font**: Change `fontFamily` and `fontSize` in `renderer.js`
- **Shell**: Modify `getShell()` in `main.js`
- **Scrollback**: Change `scrollback` in the Terminal constructor in `renderer.js`
