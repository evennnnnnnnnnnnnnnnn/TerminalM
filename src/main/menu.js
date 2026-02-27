const { Menu, app } = require('electron');

function buildMenu(mainWindow) {
  const isMac = process.platform === 'darwin';
  const send = (action) => () => mainWindow?.webContents.send('menu-action', action);

  const template = [
    ...(isMac
      ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }]
      : []),
    {
      label: 'Terminal',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: send('new-tab') },
        { label: 'Reopen Closed Tab', accelerator: 'CmdOrCtrl+Shift+T', click: send('reopen-tab') },
        { label: 'New Folder', click: send('new-folder') },
        { label: 'Close Pane', accelerator: 'CmdOrCtrl+W', click: send('close-pane') },
        { type: 'separator' },
        { label: 'Split Right', accelerator: 'CmdOrCtrl+Shift+D', click: send('split-horizontal') },
        { label: 'Split Down', accelerator: 'CmdOrCtrl+Shift+E', click: send('split-vertical') },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+Shift+F', click: send('toggle-search') },
        { label: 'Command Palette', accelerator: 'CmdOrCtrl+Shift+P', click: send('command-palette') },
        { type: 'separator' },
        { label: 'Toggle Broadcast Mode', click: send('toggle-broadcast') },
        { type: 'separator' },
        { label: 'Clear Terminal', accelerator: 'CmdOrCtrl+L', click: send('clear-terminal') },
        { type: 'separator' },
        { label: 'Save Session', click: send('save-session') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: send('open-settings') },
        { type: 'separator' },
        ...(!isMac ? [{ role: 'quit' }] : []),
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: send('zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: send('zoom-out') },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: send('zoom-reset') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
