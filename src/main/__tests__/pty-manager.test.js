import os from 'os';
import path from 'path';

const originalPlatform = process.platform;
const originalEnv = { ...process.env };

function setPlatform(p) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

let handleMap;
let onMap;
let mockPtyProcess;
let mockSpawn;
let mockFs;

function setupMocks(opts = {}) {
  handleMap = {};
  onMap = {};

  mockPtyProcess = {
    pid: opts.pid || 1234,
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
  };

  mockSpawn = opts.spawnError
    ? vi.fn(() => { throw new Error(opts.spawnError); })
    : vi.fn(() => mockPtyProcess);

  mockFs = {
    statSync: vi.fn(() => ({ isDirectory: () => true })),
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    ...(opts.fsMock || {}),
  };

  __mockRequire('electron', {
    ipcMain: {
      handle: vi.fn((ch, h) => { handleMap[ch] = h; }),
      on: vi.fn((ch, h) => { onMap[ch] = h; }),
    },
  });

  __mockRequire('./shell', {
    getShell: vi.fn(() => opts.shell || '/bin/bash'),
    getShellArgs: vi.fn(() => opts.shellArgs || ['--login']),
  });

  __mockRequire('node-pty', {
    spawn: mockSpawn,
  });

  __mockRequire('fs', mockFs);
}

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  process.env = { ...originalEnv };
  __clearAllMockRequire();
  vi.resetModules();
});

async function loadModule(opts = {}) {
  vi.resetModules();
  setupMocks(opts);
  return await import('../pty-manager.js');
}

describe('buildShellEnv', () => {
  it('sets COLORTERM to truecolor', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(mockSpawn.mock.calls[0][2].env.COLORTERM).toBe('truecolor');
  });

  it('sets TERM_PROGRAM to MultiTerminal', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(mockSpawn.mock.calls[0][2].env.TERM_PROGRAM).toBe('MultiTerminal');
  });

  it('sets PROMPT_COMMAND with OSC 7 on non-win32', async () => {
    setPlatform('linux');
    delete process.env.PROMPT_COMMAND;
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(mockSpawn.mock.calls[0][2].env.PROMPT_COMMAND).toContain('\\e]7;');
  });

  it('appends to existing PROMPT_COMMAND', async () => {
    setPlatform('linux');
    process.env.PROMPT_COMMAND = 'existing_cmd';
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    const env = mockSpawn.mock.calls[0][2].env;
    expect(env.PROMPT_COMMAND).toContain('existing_cmd');
    expect(env.PROMPT_COMMAND).toContain('\\e]7;');
  });

  it('does not set PROMPT_COMMAND on win32', async () => {
    setPlatform('win32');
    delete process.env.PROMPT_COMMAND;
    const mod = await loadModule({ shell: 'powershell.exe', shellArgs: ['-NoLogo'] });
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(mockSpawn.mock.calls[0][2].env.PROMPT_COMMAND).toBeUndefined();
  });
});

describe('OSC parsing', () => {
  async function setupWithDataCallback(platform) {
    setPlatform(platform || 'linux');
    const mod = await loadModule();
    const sendSpy = vi.fn();
    const mockWindow = { webContents: { send: sendSpy }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    const onDataCallback = mockPtyProcess.onData.mock.calls[0][0];
    return { onDataCallback, sendSpy };
  }

  it('parses OSC 7 unix path', async () => {
    const { onDataCallback, sendSpy } = await setupWithDataCallback('linux');
    onDataCallback('\x1b]7;file://localhost/home/user/project\x07');
    expect(sendSpy).toHaveBeenCalledWith('pty-cwd', { id: 't1', cwd: '/home/user/project' });
  });

  it('parses OSC 7 with URL-encoded characters', async () => {
    const { onDataCallback, sendSpy } = await setupWithDataCallback('linux');
    onDataCallback('\x1b]7;file://localhost/home/user/my%20project\x07');
    expect(sendSpy).toHaveBeenCalledWith('pty-cwd', { id: 't1', cwd: '/home/user/my project' });
  });

  it('parses OSC 7 with ST terminator', async () => {
    const { onDataCallback, sendSpy } = await setupWithDataCallback('linux');
    onDataCallback('\x1b]7;file://localhost/home/user\x1b\\');
    expect(sendSpy).toHaveBeenCalledWith('pty-cwd', { id: 't1', cwd: '/home/user' });
  });

  it('strips leading slash from Windows drive path in OSC 7', async () => {
    const { onDataCallback, sendSpy } = await setupWithDataCallback('win32');
    onDataCallback('\x1b]7;file://PC/C:/Users/test\x07');
    expect(sendSpy).toHaveBeenCalledWith('pty-cwd', { id: 't1', cwd: 'C:/Users/test' });
  });

  it('parses OSC 9;9 path', async () => {
    const { onDataCallback, sendSpy } = await setupWithDataCallback('win32');
    onDataCallback('\x1b]9;9;C:\\Users\\test\x07');
    expect(sendSpy).toHaveBeenCalledWith('pty-cwd', { id: 't1', cwd: 'C:\\Users\\test' });
  });

  it('also sends pty-data for all output', async () => {
    const { onDataCallback, sendSpy } = await setupWithDataCallback('linux');
    onDataCallback('hello world');
    expect(sendSpy).toHaveBeenCalledWith('pty-data', { id: 't1', data: 'hello world' });
  });

  it('does not send when window is destroyed', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const sendSpy = vi.fn();
    const mockWindow = { webContents: { send: sendSpy }, isDestroyed: () => true };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    const onDataCallback = mockPtyProcess.onData.mock.calls[0][0];
    onDataCallback('test');
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('pty-create', () => {
  it('spawns with the selected shell', async () => {
    setPlatform('linux');
    const mod = await loadModule({ shell: '/usr/bin/zsh', shellArgs: ['--login'] });
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(mockSpawn).toHaveBeenCalledWith('/usr/bin/zsh', ['--login'], expect.any(Object));
  });

  it('uses provided cwd when valid directory', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24, cwd: '/valid/dir' });
    expect(mockSpawn.mock.calls[0][2].cwd).toBe('/valid/dir');
  });

  it('falls back to homedir when cwd is invalid', async () => {
    setPlatform('linux');
    const mod = await loadModule({
      fsMock: { statSync: vi.fn(() => { throw new Error('ENOENT'); }) },
    });
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24, cwd: '/invalid' });
    expect(mockSpawn.mock.calls[0][2].cwd).toBe(os.homedir());
  });

  it('falls back to homedir when cwd is not provided', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(mockSpawn.mock.calls[0][2].cwd).toBe(os.homedir());
  });

  it('uses default cols/rows when not provided', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1' });
    const opts = mockSpawn.mock.calls[0][2];
    expect(opts.cols).toBe(80);
    expect(opts.rows).toBe(24);
  });

  it('returns pid, shell basename, and cwd on success', async () => {
    setPlatform('linux');
    const mod = await loadModule({ shell: '/bin/bash', pid: 5678 });
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    const result = handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(result.pid).toBe(5678);
    expect(result.shell).toBe('bash');
    expect(result.cwd).toBe(os.homedir());
  });

  it('returns error object when spawn fails', async () => {
    setPlatform('linux');
    const mod = await loadModule({ spawnError: 'spawn failed' });
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    const result = handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    expect(result.error).toBe('spawn failed');
  });
});

describe('pty-write', () => {
  it('writes data to the terminal', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    onMap['pty-write']({}, { id: 't1', data: 'ls\n' });
    expect(mockPtyProcess.write).toHaveBeenCalledWith('ls\n');
  });

  it('does nothing for unknown terminal id', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    expect(() => onMap['pty-write']({}, { id: 'unknown', data: 'test' })).not.toThrow();
  });
});

describe('pty-resize', () => {
  it('resizes the terminal', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    onMap['pty-resize']({}, { id: 't1', cols: 120, rows: 40 });
    expect(mockPtyProcess.resize).toHaveBeenCalledWith(120, 40);
  });

  it('clamps cols to minimum of 2', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    onMap['pty-resize']({}, { id: 't1', cols: 0, rows: 10 });
    expect(mockPtyProcess.resize).toHaveBeenCalledWith(2, 10);
  });

  it('clamps rows to minimum of 1', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    onMap['pty-resize']({}, { id: 't1', cols: 80, rows: 0 });
    expect(mockPtyProcess.resize).toHaveBeenCalledWith(80, 1);
  });
});

describe('pty-kill', () => {
  it('kills the pty process', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    onMap['pty-kill']({}, { id: 't1' });
    expect(mockPtyProcess.kill).toHaveBeenCalled();
  });

  it('does nothing for unknown terminal id', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    expect(() => onMap['pty-kill']({}, { id: 'unknown' })).not.toThrow();
  });
});

describe('killAllTerminals', () => {
  it('kills all active terminals', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const mockWindow = { webContents: { send: vi.fn() }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    mod.killAllTerminals();
    expect(mockPtyProcess.kill).toHaveBeenCalled();
  });
});

describe('pty-exit event', () => {
  it('sends pty-exit to renderer when process exits', async () => {
    setPlatform('linux');
    const mod = await loadModule();
    const sendSpy = vi.fn();
    const mockWindow = { webContents: { send: sendSpy }, isDestroyed: () => false };
    mod.setupPtyHandlers(() => mockWindow);
    handleMap['pty-create']({}, { id: 't1', cols: 80, rows: 24 });
    const onExitCallback = mockPtyProcess.onExit.mock.calls[0][0];
    onExitCallback({ exitCode: 0 });
    expect(sendSpy).toHaveBeenCalledWith('pty-exit', { id: 't1', exitCode: 0 });
  });
});
