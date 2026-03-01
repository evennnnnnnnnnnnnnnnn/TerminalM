/* ============================================
   TerminalM — Shared Mutable State
   ============================================ */

// Globals from UMD script tags
export const Terminal  = window.Terminal;
export const FitAddon  = window.FitAddon.FitAddon;
export const WebLinksAddon = window.WebLinksAddon.WebLinksAddon;
export const SearchAddon   = window.SearchAddon?.SearchAddon;
export const WebglAddon    = window.WebglAddon?.WebglAddon;

// ---- Counters ----
let tabCounter    = 0;
let paneCounter   = 0;
let folderCounter = 0;

export function nextTabId()    { return `tab-${++tabCounter}`; }
export function nextPaneId()   { return `pane-${++paneCounter}`; }
export function nextFolderId() { return `folder-${++folderCounter}`; }

export function getTabCounter()    { return tabCounter; }
export function getPaneCounter()   { return paneCounter; }
export function getFolderCounter() { return folderCounter; }

export function setTabCounter(n)    { tabCounter = n; }
export function setPaneCounter(n)   { paneCounter = n; }
export function setFolderCounter(n) { folderCounter = n; }

// ---- Collections ----
export const tabs          = new Map();  // tabId -> { label, paneTree, shellName, color, folderId, cwd, locked, detectedProcess }
export const folders       = new Map();  // folderId -> { label, collapsed, tabIds }
export const panes         = new Map();  // paneId -> pane node
export const lastPaneSize  = new Map();  // paneId -> { cols, rows }
export const tabDomCache   = new Map();  // tabId -> container div

// ---- Tab order ----
let tabOrder = [];
export function getTabOrder()    { return tabOrder; }
export function setTabOrder(arr) { tabOrder = arr; }

// ---- Active / focused ----
let activeTabId   = null;
let focusedPaneId = null;

export function getActiveTabId()      { return activeTabId; }
export function setActiveTabId(id)    { activeTabId = id; }
export function getFocusedPaneId()    { return focusedPaneId; }
export function setFocusedPaneId(id)  { focusedPaneId = id; }

// ---- Font size ----
let fontSize = 13;
export function getFontSize()    { return fontSize; }
export function setFontSize(n)   { fontSize = n; }

// ---- Broadcast mode ----
let broadcastMode = false;
export function getBroadcastMode()    { return broadcastMode; }
export function setBroadcastMode(v)   { broadcastMode = v; }

// ---- Session save timer ----
let sessionSaveTimer = null;
export function getSessionSaveTimer()    { return sessionSaveTimer; }
export function setSessionSaveTimer(t)   { sessionSaveTimer = t; }

// ---- Persisted Settings ----
export const SETTINGS_DEFAULTS = {
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, Consolas, monospace",
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 10000,
  autoRename: true,
  tabBarPosition: 'top',
  uiScale: 1,
};

let settings = { ...SETTINGS_DEFAULTS };
try {
  const stored = JSON.parse(localStorage.getItem('multi-terminal-settings') || '{}');
  settings = { ...SETTINGS_DEFAULTS, ...stored };
} catch {}

export function getSettings()   { return settings; }
export function setSettings(s)  { settings = s; }

// ---- Manually renamed tabs ----
export const manuallyRenamed = new Set();

// ---- Process detection patterns ----
export const PROCESS_PATTERNS = [
  { pattern: /claude|anthropic/i,                                          process: 'claude' },
  { pattern: /npm (run|start|install|test)|yarn |pnpm |bun (run|dev)/i,   process: 'node' },
  { pattern: /node |deno |tsx |ts-node/i,                                 process: 'node' },
  { pattern: /python[23]?[\s.]|pip |conda |pytest/i,                      process: 'python' },
  { pattern: /git (push|pull|commit|merge|rebase|clone|fetch|log|diff|stash)/i, process: 'git' },
  { pattern: /docker |docker-compose|podman /i,                            process: 'docker' },
  { pattern: /ssh |scp |sftp /i,                                          process: 'ssh' },
  { pattern: /vim |nvim |vi /i,                                           process: 'vim' },
  { pattern: /make |cmake |cargo build|go build|gcc |g\+\+|msbuild/i,    process: 'build' },
  { pattern: /jest |vitest |mocha |pytest |rspec|cargo test/i,            process: 'test' },
  { pattern: /psql|mysql|mongo|redis-cli|sqlite/i,                        process: 'database' },
  { pattern: /pwsh|powershell/i,                                          process: 'powershell' },
];

// ---- Context menu state ----
let contextTabId    = null;
let contextPaneId   = null;
let contextFolderId = null;

export function getContextTabId()        { return contextTabId; }
export function setContextTabId(id)      { contextTabId = id; }
export function getContextPaneId()       { return contextPaneId; }
export function setContextPaneId(id)     { contextPaneId = id; }
export function getContextFolderId()     { return contextFolderId; }
export function setContextFolderId(id)   { contextFolderId = id; }

// ---- Search ----
let searchVisible = false;
export function getSearchVisible()   { return searchVisible; }
export function setSearchVisible(v)  { searchVisible = v; }

// ---- Command palette ----
let paletteVisible = false;
let paletteIdx     = 0;
let COMMANDS       = null;

export function getPaletteVisible()   { return paletteVisible; }
export function setPaletteVisible(v)  { paletteVisible = v; }
export function getPaletteIdx()       { return paletteIdx; }
export function setPaletteIdx(n)      { paletteIdx = n; }
export function getCommands()         { return COMMANDS; }
export function setCommands(c)        { COMMANDS = c; }

// ---- Welcome ----
let welcomeShown   = false;
let mascotInterval = null;

export function getWelcomeShown()       { return welcomeShown; }
export function setWelcomeShown(v)      { welcomeShown = v; }
export function getMascotInterval()     { return mascotInterval; }
export function setMascotInterval(id)   { mascotInterval = id; }

// ---- Tab closure stack (for reopen) ----
export const tabClosureStack = [];

// ---- Quick commands ----
let quickCommands = JSON.parse(localStorage.getItem('multi-terminal-quick-cmds') || '[]');
let quickCmdEditId = null;

export function getQuickCommands()      { return quickCommands; }
export function setQuickCommands(arr)   { quickCommands = arr; }
export function getQuickCmdEditId()     { return quickCmdEditId; }
export function setQuickCmdEditId(id)   { quickCmdEditId = id; }

// ---- Feature menu ----
let featureMenuOpen = false;
export function getFeatureMenuOpen()    { return featureMenuOpen; }
export function setFeatureMenuOpen(v)   { featureMenuOpen = v; }

// ---- Playground ----
let playground3D = null;
let playgroundDetailTabId = null;

export function getPlayground3D()            { return playground3D; }
export function setPlayground3D(v)           { playground3D = v; }
export function getPlaygroundDetailTabId()   { return playgroundDetailTabId; }
export function setPlaygroundDetailTabId(id) { playgroundDetailTabId = id; }

// ---- PTY resize timer ----
let _ptyResizeTimer = null;
export function getPtyResizeTimer()    { return _ptyResizeTimer; }
export function setPtyResizeTimer(t)   { _ptyResizeTimer = t; }
