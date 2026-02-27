const { ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pty = require('node-pty');
const { getShell, getShellArgs } = require('./shell');

const terminals = new Map();

// Regex to detect CWD-reporting OSC sequences from shells
// OSC 7: file://hostname/path  (bash, zsh, fish)
// OSC 9;9: path  (ConEmu/Windows Terminal/PowerShell)
const OSC7_RE = /\x1b\]7;file:\/\/[^/]*(\/.+?)(?:\x07|\x1b\\)/;
const OSC9_RE = /\x1b\]9;9;(.+?)(?:\x07|\x1b\\)/;

function buildShellEnv() {
  const env = {
    ...process.env,
    COLORTERM: 'truecolor',
    TERM_PROGRAM: 'MultiTerminal',
  };

  // For bash, inject PROMPT_COMMAND to emit OSC 7
  if (process.platform !== 'win32') {
    const existing = process.env.PROMPT_COMMAND || '';
    const osc7 = 'printf \'\\e]7;file://%s%s\\e\\\\\' "$HOSTNAME" "$PWD"';
    env.PROMPT_COMMAND = existing ? `${osc7};${existing}` : osc7;
  }

  return env;
}

function setupPtyHandlers(getMainWindow) {
  ipcMain.handle('pty-create', (event, { id, cols, rows, cwd }) => {
    const shell = getShell();
    const args = getShellArgs();

    // Use provided cwd if it's a valid directory, otherwise fall back to home
    let startDir = os.homedir();
    if (cwd) {
      try {
        const stat = fs.statSync(cwd);
        if (stat.isDirectory()) startDir = cwd;
      } catch {}
    }

    try {
      const ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: startDir,
        env: buildShellEnv(),
      });

      terminals.set(id, ptyProcess);

      const mainWindow = getMainWindow();

      ptyProcess.onData((data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Parse OSC sequences for CWD updates
          let cwdMatch = data.match(OSC7_RE);
          if (cwdMatch) {
            try {
              let cwdPath = decodeURIComponent(cwdMatch[1]);
              // On Windows, OSC 7 gives /C:/path — strip leading slash
              if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(cwdPath)) {
                cwdPath = cwdPath.substring(1);
              }
              mainWindow.webContents.send('pty-cwd', { id, cwd: cwdPath });
            } catch {}
          }
          if (!cwdMatch) {
            cwdMatch = data.match(OSC9_RE);
            if (cwdMatch) {
              mainWindow.webContents.send('pty-cwd', { id, cwd: cwdMatch[1] });
            }
          }

          mainWindow.webContents.send('pty-data', { id, data });
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        terminals.delete(id);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('pty-exit', { id, exitCode });
        }
      });

      return { pid: ptyProcess.pid, shell: path.basename(shell), cwd: startDir };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.on('pty-write', (event, { id, data }) => {
    const term = terminals.get(id);
    if (term) term.write(data);
  });

  ipcMain.on('pty-resize', (event, { id, cols, rows }) => {
    const term = terminals.get(id);
    if (term) {
      try {
        term.resize(Math.max(cols, 2), Math.max(rows, 1));
      } catch {}
    }
  });

  ipcMain.on('pty-kill', (event, { id }) => {
    const term = terminals.get(id);
    if (term) {
      term.kill();
      terminals.delete(id);
    }
  });

  ipcMain.handle('get-platform', () => process.platform);
  ipcMain.handle('get-shell-name', () => path.basename(getShell()));
}

function killAllTerminals() {
  for (const term of terminals.values()) {
    try { term.kill(); } catch {}
  }
  terminals.clear();
}

module.exports = { setupPtyHandlers, killAllTerminals };
