const originalPlatform = process.platform;
const originalEnv = { ...process.env };

function setPlatform(p) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

let mockExistsSync;

beforeEach(() => {
  mockExistsSync = vi.fn(() => false);
  __mockRequire('fs', {
    existsSync: mockExistsSync,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  });
});

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  process.env = { ...originalEnv };
  __clearAllMockRequire();
  vi.resetModules();
});

async function loadShell() {
  vi.resetModules();
  return await import('../shell.js');
}

describe('getShell', () => {
  it('returns pwsh.exe on win32 when PowerShell 7 exists', async () => {
    setPlatform('win32');
    mockExistsSync.mockReturnValue(true);
    const { getShell } = await loadShell();
    expect(getShell()).toBe('C:\\Program Files\\PowerShell\\7\\pwsh.exe');
  });

  it('returns powershell.exe on win32 when PowerShell 7 is missing', async () => {
    setPlatform('win32');
    mockExistsSync.mockReturnValue(false);
    const { getShell } = await loadShell();
    expect(getShell()).toBe('powershell.exe');
  });

  it('returns $SHELL on linux when set', async () => {
    setPlatform('linux');
    process.env.SHELL = '/usr/bin/zsh';
    const { getShell } = await loadShell();
    expect(getShell()).toBe('/usr/bin/zsh');
  });

  it('returns /bin/bash on linux when $SHELL is unset', async () => {
    setPlatform('linux');
    delete process.env.SHELL;
    const { getShell } = await loadShell();
    expect(getShell()).toBe('/bin/bash');
  });

  it('returns $SHELL on darwin', async () => {
    setPlatform('darwin');
    process.env.SHELL = '/bin/zsh';
    const { getShell } = await loadShell();
    expect(getShell()).toBe('/bin/zsh');
  });
});

describe('getShellArgs', () => {
  it('returns encoded command args on win32 with pwsh', async () => {
    setPlatform('win32');
    mockExistsSync.mockReturnValue(true);
    const { getShellArgs } = await loadShell();
    const args = getShellArgs();
    expect(args[0]).toBe('-NoLogo');
    expect(args[1]).toBe('-NoExit');
    expect(args[2]).toBe('-EncodedCommand');
    const decoded = Buffer.from(args[3], 'base64').toString('utf16le');
    expect(decoded).toContain('Test-Path $PROFILE');
  });

  it('returns encoded command args on win32 with powershell (no profile loading)', async () => {
    setPlatform('win32');
    mockExistsSync.mockReturnValue(false);
    const { getShellArgs } = await loadShell();
    const args = getShellArgs();
    expect(args[2]).toBe('-EncodedCommand');
    const decoded = Buffer.from(args[3], 'base64').toString('utf16le');
    expect(decoded).not.toContain('Test-Path $PROFILE');
    expect(decoded).toContain('$__mtOrig');
  });

  it('returns ["-l"] for fish shell', async () => {
    setPlatform('linux');
    process.env.SHELL = '/usr/bin/fish';
    const { getShellArgs } = await loadShell();
    expect(getShellArgs()).toEqual(['-l']);
  });

  it('returns ["--login"] for bash', async () => {
    setPlatform('linux');
    process.env.SHELL = '/bin/bash';
    const { getShellArgs } = await loadShell();
    expect(getShellArgs()).toEqual(['--login']);
  });

  it('returns ["--login"] for zsh', async () => {
    setPlatform('linux');
    process.env.SHELL = '/bin/zsh';
    const { getShellArgs } = await loadShell();
    expect(getShellArgs()).toEqual(['--login']);
  });

  it('returns [] for unknown shell', async () => {
    setPlatform('linux');
    process.env.SHELL = '/usr/local/bin/elvish';
    const { getShellArgs } = await loadShell();
    expect(getShellArgs()).toEqual([]);
  });

  it('encoded command contains OSC 9;9 prompt function', async () => {
    setPlatform('win32');
    mockExistsSync.mockReturnValue(false);
    const { getShellArgs } = await loadShell();
    const args = getShellArgs();
    const decoded = Buffer.from(args[3], 'base64').toString('utf16le');
    expect(decoded).toContain(']9;9;');
  });
});
