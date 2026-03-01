import path from 'path';

let mockFs;
let handleMap;
let onMap;

function setupMocks() {
  handleMap = {};
  onMap = {};

  mockFs = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    unlinkSync: vi.fn(),
    statSync: vi.fn(),
  };

  __mockRequire('electron', {
    app: { getPath: vi.fn(() => '/mock/userData') },
    ipcMain: {
      handle: vi.fn((ch, h) => { handleMap[ch] = h; }),
      on: vi.fn((ch, h) => { onMap[ch] = h; }),
    },
  });
  __mockRequire('fs', mockFs);
}

afterEach(() => {
  __clearAllMockRequire();
  vi.resetModules();
});

async function loadModule() {
  vi.resetModules();
  setupMocks();
  const mod = await import('../session-state.js');
  mod.setupSessionHandlers();
  return mod;
}

describe('session-save', () => {
  it('writes session data to file', async () => {
    await loadModule();
    const data = { tabs: [{ id: '1' }] };
    handleMap['session-save']({}, data);
    expect(mockFs.writeFileSync).toHaveBeenCalled();
    const written = JSON.parse(mockFs.writeFileSync.mock.calls[0][1]);
    expect(written.tabs[0].id).toBe('1');
  });

  it('returns true on success', async () => {
    await loadModule();
    const result = handleMap['session-save']({}, {});
    expect(result).toBe(true);
  });
});

describe('session-save-sync', () => {
  it('writes data and sets returnValue to true', async () => {
    await loadModule();
    const event = { returnValue: null };
    onMap['session-save-sync'](event, { tabs: [] });
    expect(event.returnValue).toBe(true);
    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });
});

describe('session-load', () => {
  it('returns parsed session from file', async () => {
    await loadModule();
    const data = { tabs: [{ id: '2' }] };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(data));
    const result = handleMap['session-load']();
    expect(result.tabs[0].id).toBe('2');
  });

  it('returns null when file is missing', async () => {
    await loadModule();
    mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = handleMap['session-load']();
    expect(result).toBeNull();
  });
});

describe('save-buffer', () => {
  it('writes buffer content to file', async () => {
    await loadModule();
    handleMap['save-buffer']({}, { tabId: 'tab1', content: 'hello' });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('tab1.buf'),
      'hello'
    );
  });

  it('creates buffer directory if missing', async () => {
    await loadModule();
    mockFs.existsSync.mockReturnValue(false);
    handleMap['save-buffer']({}, { tabId: 'tab1', content: 'data' });
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  it('returns true', async () => {
    await loadModule();
    const result = handleMap['save-buffer']({}, { tabId: 'tab1', content: 'data' });
    expect(result).toBe(true);
  });
});

describe('load-buffer', () => {
  it('returns buffer content from file', async () => {
    await loadModule();
    mockFs.readFileSync.mockReturnValue('saved content');
    const result = handleMap['load-buffer']({}, 'tab1');
    expect(result).toBe('saved content');
  });

  it('returns null when buffer file is missing', async () => {
    await loadModule();
    mockFs.readFileSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = handleMap['load-buffer']({}, 'tab1');
    expect(result).toBeNull();
  });
});

describe('save-buffers-sync', () => {
  it('writes all buffers and sets returnValue', async () => {
    await loadModule();
    const event = { returnValue: null };
    const buffers = [
      { tabId: 'a', content: 'contentA' },
      { tabId: 'b', content: 'contentB' },
    ];
    onMap['save-buffers-sync'](event, buffers);
    expect(event.returnValue).toBe(true);
    const writeCalls = mockFs.writeFileSync.mock.calls;
    expect(writeCalls.length).toBe(2);
  });

  it('cleans up orphan buffer files', async () => {
    await loadModule();
    mockFs.readdirSync.mockReturnValue(['a.buf', 'b.buf', 'orphan.buf']);
    const event = { returnValue: null };
    const buffers = [
      { tabId: 'a', content: 'contentA' },
      { tabId: 'b', content: 'contentB' },
    ];
    onMap['save-buffers-sync'](event, buffers);
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('orphan.buf'));
  });

  it('skips buffers with empty content', async () => {
    await loadModule();
    const event = { returnValue: null };
    const buffers = [
      { tabId: 'a', content: '' },
      { tabId: 'b', content: 'data' },
    ];
    onMap['save-buffers-sync'](event, buffers);
    const writeCalls = mockFs.writeFileSync.mock.calls;
    expect(writeCalls.length).toBe(1);
  });
});

describe('cleanup-buffers', () => {
  it('removes buffer files not in active tab list', async () => {
    await loadModule();
    mockFs.readdirSync.mockReturnValue(['tab1.buf', 'tab2.buf', 'tab3.buf']);
    handleMap['cleanup-buffers']({}, ['tab1', 'tab3']);
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('tab2.buf'));
    expect(mockFs.unlinkSync).toHaveBeenCalledTimes(1);
  });

  it('returns early when buffer dir does not exist', async () => {
    await loadModule();
    mockFs.existsSync.mockReturnValue(false);
    handleMap['cleanup-buffers']({}, ['tab1']);
    expect(mockFs.readdirSync).not.toHaveBeenCalled();
  });
});

describe('resolve-path', () => {
  it('returns dir and name for a directory path', async () => {
    await loadModule();
    mockFs.statSync.mockReturnValue({ isDirectory: () => true });
    const result = handleMap['resolve-path']({}, '/home/user/projects');
    expect(result.dir).toBe(path.resolve('/home/user/projects'));
    expect(result.name).toBe('projects');
  });

  it('returns parent dir for a file path', async () => {
    await loadModule();
    mockFs.statSync.mockReturnValue({ isDirectory: () => false });
    const result = handleMap['resolve-path']({}, '/home/user/projects/file.txt');
    expect(result.dir).toBe(path.resolve('/home/user/projects'));
  });

  it('returns null for nonexistent path', async () => {
    await loadModule();
    mockFs.statSync.mockImplementation(() => { throw new Error('ENOENT'); });
    const result = handleMap['resolve-path']({}, '/nonexistent');
    expect(result).toBeNull();
  });
});
