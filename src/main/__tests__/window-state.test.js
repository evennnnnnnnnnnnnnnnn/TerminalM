let mockReadFileSync;
let mockWriteFileSync;

function setupMocks() {
  mockReadFileSync = vi.fn();
  mockWriteFileSync = vi.fn();
  __mockRequire('electron', {
    app: { getPath: vi.fn(() => '/mock/userData') },
  });
  __mockRequire('fs', {
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  });
}

afterEach(() => {
  __clearAllMockRequire();
  vi.resetModules();
});

async function loadModule() {
  vi.resetModules();
  setupMocks();
  return await import('../window-state.js');
}

describe('loadWindowState', () => {
  it('returns parsed state from valid JSON file', async () => {
    const state = { width: 1000, height: 600, x: 50, y: 50, isMaximized: true };
    const { loadWindowState } = await loadModule();
    mockReadFileSync.mockReturnValue(JSON.stringify(state));
    expect(loadWindowState()).toEqual(state);
  });

  it('returns defaults when file is missing', async () => {
    const { loadWindowState } = await loadModule();
    mockReadFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = loadWindowState();
    expect(result.width).toBe(1200);
    expect(result.height).toBe(800);
    expect(result.isMaximized).toBe(false);
  });

  it('returns defaults when file contains corrupt JSON', async () => {
    const { loadWindowState } = await loadModule();
    mockReadFileSync.mockReturnValue('{broken json');
    const result = loadWindowState();
    expect(result.width).toBe(1200);
    expect(result.height).toBe(800);
  });

  it('reads from correct path', async () => {
    const { loadWindowState } = await loadModule();
    mockReadFileSync.mockReturnValue(JSON.stringify({ width: 100 }));
    loadWindowState();
    const readPath = mockReadFileSync.mock.calls[0][0];
    expect(readPath).toContain('window-state.json');
  });
});

describe('saveWindowState', () => {
  it('serializes window bounds and maximized state', async () => {
    const { saveWindowState } = await loadModule();
    const mockWin = {
      getBounds: () => ({ width: 900, height: 700, x: 10, y: 20 }),
      isMaximized: () => false,
    };
    saveWindowState(mockWin);
    const written = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(written).toEqual({ width: 900, height: 700, x: 10, y: 20, isMaximized: false });
  });

  it('does nothing when win is null', async () => {
    const { saveWindowState } = await loadModule();
    saveWindowState(null);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('swallows write errors without throwing', async () => {
    const { saveWindowState } = await loadModule();
    mockWriteFileSync.mockImplementation(() => { throw new Error('EACCES'); });
    const mockWin = {
      getBounds: () => ({ width: 900, height: 700, x: 10, y: 20 }),
      isMaximized: () => false,
    };
    expect(() => saveWindowState(mockWin)).not.toThrow();
  });

  it('writes to correct path', async () => {
    const { saveWindowState } = await loadModule();
    const mockWin = {
      getBounds: () => ({ width: 900, height: 700, x: 10, y: 20 }),
      isMaximized: () => false,
    };
    saveWindowState(mockWin);
    const writePath = mockWriteFileSync.mock.calls[0][0];
    expect(writePath).toContain('window-state.json');
  });
});
