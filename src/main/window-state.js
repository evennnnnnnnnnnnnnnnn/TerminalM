const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const stateFile = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return { width: 1200, height: 800, x: undefined, y: undefined, isMaximized: false };
  }
}

function saveWindowState(win) {
  if (!win) return;
  const bounds = win.getBounds();
  const state = {
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    isMaximized: win.isMaximized(),
  };
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state));
  } catch {}
}

module.exports = { loadWindowState, saveWindowState };
