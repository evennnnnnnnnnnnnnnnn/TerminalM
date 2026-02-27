const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { loadWindowState, saveWindowState } = require('./src/main/window-state');
const { setupPtyHandlers, killAllTerminals } = require('./src/main/pty-manager');
const { buildMenu } = require('./src/main/menu');
const { setupSessionHandlers } = require('./src/main/session-state');

let mainWindow;

function getMainWindow() { return mainWindow; }

function createWindow() {
  const state = loadWindowState();

  const windowOptions = {
    width: state.width,
    height: state.height,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#1e1e2e',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (state.x !== undefined && state.y !== undefined) {
    windowOptions.x = state.x;
    windowOptions.y = state.y;
  }

  if (process.platform === 'darwin') {
    windowOptions.titleBarStyle = 'hiddenInset';
    windowOptions.trafficLightPosition = { x: 12, y: 12 };
  } else {
    windowOptions.titleBarStyle = 'hidden';
    windowOptions.titleBarOverlay = {
      color: '#181825',
      symbolColor: '#cdd6f4',
      height: 46,
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  if (state.isMaximized) mainWindow.maximize();

  mainWindow.loadFile('src/renderer/pages/terminal.html');

  mainWindow.once('ready-to-show', () => mainWindow.show());

  let windowStateTimer;
  const debouncedSaveState = () => { clearTimeout(windowStateTimer); windowStateTimer = setTimeout(() => saveWindowState(mainWindow), 300); };
  mainWindow.on('resize', debouncedSaveState);
  mainWindow.on('move', debouncedSaveState);
  mainWindow.on('close', () => saveWindowState(mainWindow)); // immediate on close

  mainWindow.on('focus', () => mainWindow.webContents.send('window-focus', true));
  mainWindow.on('blur', () => mainWindow.webContents.send('window-focus', false));

  buildMenu(mainWindow);
}

setupPtyHandlers(getMainWindow);
setupSessionHandlers();

// Save dialog handler for exporting terminal output
ipcMain.handle('show-save-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showSaveDialog(win, options);
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, options.content || '', 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { canceled: true };
});

// Theme change handler — update titlebar overlay colors (outside createWindow to avoid listener leaks)
ipcMain.on('set-theme', (event, theme) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  if (process.platform !== 'darwin') {
    const colors = theme === 'light'
      ? { color: '#e6e9ef', symbolColor: '#4c4f69' }
      : { color: '#181825', symbolColor: '#cdd6f4' };
    try { win.setTitleBarOverlay(colors); } catch {}
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  killAllTerminals();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
