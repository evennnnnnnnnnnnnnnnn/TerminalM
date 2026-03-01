const originalPlatform = process.platform;

function setPlatform(p) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true });
}

let mockBuildFromTemplate;
let mockSetApplicationMenu;

beforeEach(() => {
  mockBuildFromTemplate = vi.fn((t) => t);
  mockSetApplicationMenu = vi.fn();
  __mockRequire('electron', {
    Menu: {
      buildFromTemplate: mockBuildFromTemplate,
      setApplicationMenu: mockSetApplicationMenu,
    },
    app: { name: 'TerminalM' },
  });
});

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  __clearAllMockRequire();
  vi.resetModules();
});

async function buildMenuForTest(platform) {
  vi.resetModules();
  setPlatform(platform || 'win32');

  // Re-register mocks after resetModules since import will re-require
  mockBuildFromTemplate = vi.fn((t) => t);
  mockSetApplicationMenu = vi.fn();
  __mockRequire('electron', {
    Menu: {
      buildFromTemplate: mockBuildFromTemplate,
      setApplicationMenu: mockSetApplicationMenu,
    },
    app: { name: 'TerminalM' },
  });

  const { buildMenu } = await import('../menu.js');
  const mockWindow = {
    webContents: { send: vi.fn() },
  };
  buildMenu(mockWindow);

  const template = mockBuildFromTemplate.mock.calls[0][0];
  return { template, mockWindow };
}

describe('buildMenu', () => {
  it('calls Menu.setApplicationMenu', async () => {
    await buildMenuForTest('win32');
    expect(mockSetApplicationMenu).toHaveBeenCalled();
  });

  it('has Terminal, Edit, View submenus on win32', async () => {
    const { template } = await buildMenuForTest('win32');
    const labels = template.map((m) => m.label).filter(Boolean);
    expect(labels).toContain('Terminal');
    expect(labels).toContain('Edit');
    expect(labels).toContain('View');
  });

  it('includes macOS app menu with About and Quit on darwin', async () => {
    const { template } = await buildMenuForTest('darwin');
    const appMenu = template[0];
    expect(appMenu.label).toBe('TerminalM');
    const roles = appMenu.submenu.map((i) => i.role).filter(Boolean);
    expect(roles).toContain('about');
    expect(roles).toContain('quit');
  });

  it('does not include macOS app menu on win32', async () => {
    const { template } = await buildMenuForTest('win32');
    expect(template[0].label).not.toBe('TerminalM');
  });

  it('includes a quit role in Terminal submenu on win32', async () => {
    const { template } = await buildMenuForTest('win32');
    const terminal = template.find((m) => m.label === 'Terminal');
    const roles = terminal.submenu.map((i) => i.role).filter(Boolean);
    expect(roles).toContain('quit');
  });

  it('does not include quit in Terminal submenu on darwin', async () => {
    const { template } = await buildMenuForTest('darwin');
    const terminal = template.find((m) => m.label === 'Terminal');
    const roles = terminal.submenu.map((i) => i.role).filter(Boolean);
    expect(roles).not.toContain('quit');
  });

  it('has correct accelerator for New Tab', async () => {
    const { template } = await buildMenuForTest('win32');
    const terminal = template.find((m) => m.label === 'Terminal');
    const newTab = terminal.submenu.find((i) => i.label === 'New Tab');
    expect(newTab.accelerator).toBe('CmdOrCtrl+T');
  });

  it('has correct accelerator for Find', async () => {
    const { template } = await buildMenuForTest('win32');
    const terminal = template.find((m) => m.label === 'Terminal');
    const find = terminal.submenu.find((i) => i.label === 'Find');
    expect(find.accelerator).toBe('CmdOrCtrl+Shift+F');
  });

  it('click handler sends IPC action for New Tab', async () => {
    const { template, mockWindow } = await buildMenuForTest('win32');
    const terminal = template.find((m) => m.label === 'Terminal');
    const newTab = terminal.submenu.find((i) => i.label === 'New Tab');
    newTab.click();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('menu-action', 'new-tab');
  });

  it('click handler sends IPC action for split-horizontal', async () => {
    const { template, mockWindow } = await buildMenuForTest('win32');
    const terminal = template.find((m) => m.label === 'Terminal');
    const split = terminal.submenu.find((i) => i.label === 'Split Right');
    split.click();
    expect(mockWindow.webContents.send).toHaveBeenCalledWith('menu-action', 'split-horizontal');
  });

  it('View submenu contains zoom controls', async () => {
    const { template } = await buildMenuForTest('win32');
    const view = template.find((m) => m.label === 'View');
    const labels = view.submenu.map((i) => i.label).filter(Boolean);
    expect(labels).toContain('Zoom In');
    expect(labels).toContain('Zoom Out');
    expect(labels).toContain('Reset Zoom');
  });
});
