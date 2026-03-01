const { vi } = require('vitest');

const app = {
  getPath: vi.fn(() => '/mock/userData'),
  name: 'TerminalM',
};

const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
};

const Menu = {
  buildFromTemplate: vi.fn((t) => t),
  setApplicationMenu: vi.fn(),
};

const BrowserWindow = vi.fn();

const dialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
};

module.exports = { app, ipcMain, Menu, BrowserWindow, dialog };
