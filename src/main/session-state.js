const path = require('path');
const fs = require('fs');
const { app, ipcMain } = require('electron');

const sessionFile = path.join(app.getPath('userData'), 'session-state.json');
const buffersDir = path.join(app.getPath('userData'), 'terminal-buffers');

function loadSession() {
  try {
    return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  } catch {
    return null;
  }
}

function saveSession(data) {
  try {
    fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2));
  } catch {}
}

function setupSessionHandlers() {
  ipcMain.handle('session-save', (_event, data) => {
    saveSession(data);
    return true;
  });

  // Synchronous save for beforeunload — ensures data is written before window closes
  ipcMain.on('session-save-sync', (event, data) => {
    saveSession(data);
    event.returnValue = true;
  });

  // Synchronous buffer save for beforeunload — ensures buffers are written before window closes
  ipcMain.on('save-buffers-sync', (event, buffers) => {
    try {
      if (!fs.existsSync(buffersDir)) fs.mkdirSync(buffersDir, { recursive: true });
      for (const { tabId, content } of buffers) {
        if (content && content.length > 0) {
          fs.writeFileSync(path.join(buffersDir, `${tabId}.buf`), content, 'utf8');
        }
      }
      // Clean up buffers for deleted tabs
      const activeIds = new Set(buffers.map(b => b.tabId));
      const files = fs.readdirSync(buffersDir);
      for (const file of files) {
        const id = file.replace('.buf', '');
        if (!activeIds.has(id)) {
          try { fs.unlinkSync(path.join(buffersDir, file)); } catch {}
        }
      }
    } catch {}
    event.returnValue = true;
  });

  ipcMain.handle('session-load', () => {
    return loadSession();
  });

  // Save terminal buffer content
  ipcMain.handle('save-buffer', (_event, { tabId, content }) => {
    try {
      if (!fs.existsSync(buffersDir)) fs.mkdirSync(buffersDir, { recursive: true });
      fs.writeFileSync(path.join(buffersDir, `${tabId}.buf`), content);
    } catch {}
    return true;
  });

  // Load terminal buffer content
  ipcMain.handle('load-buffer', (_event, tabId) => {
    try {
      return fs.readFileSync(path.join(buffersDir, `${tabId}.buf`), 'utf8');
    } catch {
      return null;
    }
  });

  // Clean up buffer files for tabs that no longer exist
  ipcMain.handle('cleanup-buffers', (_event, activeTabIds) => {
    try {
      if (!fs.existsSync(buffersDir)) return;
      const files = fs.readdirSync(buffersDir);
      for (const file of files) {
        const tabId = file.replace('.buf', '');
        if (!activeTabIds.includes(tabId)) {
          try { fs.unlinkSync(path.join(buffersDir, file)); } catch {}
        }
      }
    } catch {}
    return true;
  });

  ipcMain.handle('resolve-path', (_event, inputPath) => {
    // Resolve a dropped path — check if it's a directory or get its parent
    try {
      const resolved = path.resolve(inputPath);
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) return { dir: resolved, name: path.basename(resolved) };
      // It's a file — use its parent directory
      const dir = path.dirname(resolved);
      return { dir, name: path.basename(dir) };
    } catch {
      return null;
    }
  });
}

module.exports = { setupSessionHandlers };
