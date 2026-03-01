const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Dev/prod environment separation — must run before importing modules
// that capture app.getPath('userData') at load time.
const isDev = !app.isPackaged;
if (isDev) {
  app.setPath('userData', app.getPath('userData') + '-dev');
}

const { loadWindowState, saveWindowState } = require('./window-state');
const { setupPtyHandlers, killAllTerminals } = require('./pty-manager');
const { buildMenu } = require('./menu');
const { setupSessionHandlers } = require('./session-state');
const { TITLEBAR_COLORS, DEFAULT_BG } = require('./theme-colors');

let mainWindow;

function getMainWindow() { return mainWindow; }

function createWindow() {
  const state = loadWindowState();

  const windowOptions = {
    width: state.width,
    height: state.height,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: DEFAULT_BG,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
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
      color: TITLEBAR_COLORS.dark.color,
      symbolColor: TITLEBAR_COLORS.dark.symbolColor,
      height: 46,
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  if (state.isMaximized) mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'pages', 'terminal.html'));

  if (isDev) mainWindow.setTitle('TerminalM [DEV]');

  mainWindow.once('ready-to-show', () => mainWindow.show());

  let windowStateTimer;
  const debouncedSaveState = () => {
    clearTimeout(windowStateTimer);
    windowStateTimer = setTimeout(() => saveWindowState(mainWindow), 300);
  };
  mainWindow.on('resize', debouncedSaveState);
  mainWindow.on('move', debouncedSaveState);
  mainWindow.on('close', () => saveWindowState(mainWindow)); // immediate on close

  mainWindow.on('focus', () => mainWindow.webContents.send('window-focus', true));
  mainWindow.on('blur', () => mainWindow.webContents.send('window-focus', false));

  buildMenu(mainWindow);
}

setupPtyHandlers(getMainWindow);
setupSessionHandlers();

ipcMain.handle('is-dev', () => isDev);

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

// Open dialog handler for selecting directories (e.g. folder root path)
ipcMain.handle('show-open-dialog', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, options);
  if (!result.canceled && result.filePaths?.length > 0) {
    return result.filePaths;
  }
  return [];
});

// Theme change handler — update titlebar overlay colors (outside createWindow to avoid listener leaks)
ipcMain.on('set-theme', (event, theme) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  if (process.platform !== 'darwin') {
    const colors = TITLEBAR_COLORS[theme] || TITLEBAR_COLORS.dark;
    try { win.setTitleBarOverlay(colors); } catch {}
  }
});

// --- Auto-updater (disabled in dev) ---
if (!isDev) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', `Update v${info.version} available, downloading...`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'It will be installed when you restart the app. Restart now?',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-update error:', err.message);
  });
}

app.whenReady().then(() => {
  createWindow();
  if (!isDev) autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
  killAllTerminals();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
