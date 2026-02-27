const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('termAPI', {
  // PTY lifecycle
  createPty: (id, cols, rows, cwd) => ipcRenderer.invoke('pty-create', { id, cols, rows, cwd }),
  writePty: (id, data) => ipcRenderer.send('pty-write', { id, data }),
  resizePty: (id, cols, rows) => ipcRenderer.send('pty-resize', { id, cols, rows }),
  killPty: (id) => ipcRenderer.send('pty-kill', { id }),

  // PTY events
  onData: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('pty-data', handler);
    return () => ipcRenderer.removeListener('pty-data', handler);
  },
  onExit: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('pty-exit', handler);
    return () => ipcRenderer.removeListener('pty-exit', handler);
  },
  onCwdChange: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('pty-cwd', handler);
    return () => ipcRenderer.removeListener('pty-cwd', handler);
  },

  // Menu actions
  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  },

  // Window focus
  onWindowFocus: (callback) => {
    const handler = (_event, focused) => callback(focused);
    ipcRenderer.on('window-focus', handler);
    return () => ipcRenderer.removeListener('window-focus', handler);
  },

  // Session persistence
  saveSession: (data) => ipcRenderer.invoke('session-save', data),
  saveSessionSync: (data) => ipcRenderer.sendSync('session-save-sync', data),
  loadSession: () => ipcRenderer.invoke('session-load'),

  // Path resolution (for drag & drop)
  resolvePath: (inputPath) => ipcRenderer.invoke('resolve-path', inputPath),

  // Terminal buffer persistence
  saveBuffer: (tabId, content) => ipcRenderer.invoke('save-buffer', { tabId, content }),
  saveBuffersSync: (buffers) => ipcRenderer.sendSync('save-buffers-sync', buffers),
  loadBuffer: (tabId) => ipcRenderer.invoke('load-buffer', tabId),
  cleanupBuffers: (activeTabIds) => ipcRenderer.invoke('cleanup-buffers', activeTabIds),

  // Theme
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),

  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getShellName: () => ipcRenderer.invoke('get-shell-name'),

  // File dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
});
