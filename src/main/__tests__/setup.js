/**
 * Vitest setup file that patches Node's Module._load to support
 * mocking CommonJS require() calls from ESM test files.
 *
 * Usage in tests:
 *   globalThis.__mockRequire('electron', { app: {...}, ipcMain: {...} });
 *   globalThis.__clearMockRequire('electron');  // or clear all
 *   globalThis.__clearAllMockRequire();
 */
import { createRequire } from 'module';
import Module from 'module';

const mocks = {};

const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  if (mocks[request]) {
    return mocks[request];
  }
  return originalLoad.call(this, request, parent, isMain);
};

globalThis.__mockRequire = (moduleName, mockExports) => {
  mocks[moduleName] = mockExports;
};

globalThis.__clearMockRequire = (moduleName) => {
  delete mocks[moduleName];
};

globalThis.__clearAllMockRequire = () => {
  for (const key of Object.keys(mocks)) {
    delete mocks[key];
  }
};
