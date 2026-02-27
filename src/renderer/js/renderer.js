/* ============================================
   Multi Terminal — Renderer
   ============================================ */

// Globals from UMD script tags
const Terminal = window.Terminal;
const FitAddon = window.FitAddon.FitAddon;
const WebLinksAddon = window.WebLinksAddon.WebLinksAddon;
const SearchAddon = window.SearchAddon?.SearchAddon;
const WebglAddon = window.WebglAddon?.WebglAddon;

// ---- Themes ----
const THEMES = {
  dark: {
    background:          '#1e1e2e',
    foreground:          '#cdd6f4',
    cursor:              '#f5e0dc',
    cursorAccent:        '#1e1e2e',
    selectionBackground: 'rgba(137,180,250,0.3)',
    selectionForeground: '#cdd6f4',
    black:   '#45475a', red:     '#f38ba8', green:   '#a6e3a1', yellow:  '#f9e2af',
    blue:    '#89b4fa', magenta: '#cba6f7', cyan:    '#94e2d5', white:   '#bac2de',
    brightBlack: '#585b70', brightRed:   '#f38ba8', brightGreen:   '#a6e3a1',
    brightYellow:'#f9e2af', brightBlue:  '#89b4fa', brightMagenta: '#cba6f7',
    brightCyan:  '#94e2d5', brightWhite: '#a6adc8',
  },
  light: {
    background:          '#eff1f5',
    foreground:          '#4c4f69',
    cursor:              '#dc8a78',
    cursorAccent:        '#eff1f5',
    selectionBackground: 'rgba(30,102,245,0.2)',
    selectionForeground: '#4c4f69',
    black:   '#5c5f77', red:     '#d20f39', green:   '#40a02b', yellow:  '#df8e1d',
    blue:    '#1e66f5', magenta: '#8839ef', cyan:    '#179299', white:   '#acb0be',
    brightBlack: '#6c6f85', brightRed:   '#d20f39', brightGreen:   '#40a02b',
    brightYellow:'#df8e1d', brightBlue:  '#1e66f5', brightMagenta: '#8839ef',
    brightCyan:  '#179299', brightWhite: '#bcc0cc',
  },
};

let currentTheme = localStorage.getItem('multi-terminal-theme') || 'dark';
let THEME = THEMES[currentTheme];

/* ===========================
   STATE
   =========================== */
let tabCounter = 0;
let paneCounter = 0;
let folderCounter = 0;

const tabs = new Map();       // tabId -> { label, paneTree, shellName, color, folderId, cwd, locked, detectedProcess }
const folders = new Map();    // folderId -> { label, collapsed, tabIds }
let tabOrder = [];            // [{ type:'tab'|'folder', id }]
let activeTabId = null;
let focusedPaneId = null;
let fontSize = 13;
const panes = new Map();      // paneId -> pane node
let broadcastMode = false;
let sessionSaveTimer = null;
let quickCommands = JSON.parse(localStorage.getItem('multi-terminal-quick-cmds') || '[]');
let quickCmdEditId = null; // null = new, string = editing existing
let playgroundDetailTabId = null;
const tabClosureStack = [];   // For reopen last closed tab (max 10)

/* ---- Persisted Settings ---- */
const SETTINGS_DEFAULTS = {
  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, Consolas, monospace",
  cursorStyle: 'bar',
  cursorBlink: true,
  scrollback: 10000,
  autoRename: true,
};
let settings = { ...SETTINGS_DEFAULTS };
try {
  const stored = JSON.parse(localStorage.getItem('multi-terminal-settings') || '{}');
  settings = { ...SETTINGS_DEFAULTS, ...stored };
} catch {}
const manuallyRenamed = new Set(); // Track tabs the user has manually renamed

/* ---- Process Detection Patterns ---- */
const PROCESS_PATTERNS = [
  { pattern: /claude|anthropic/i, process: 'claude' },
  { pattern: /npm (run|start|install|test)|yarn |pnpm |bun (run|dev)/i, process: 'node' },
  { pattern: /node |deno |tsx |ts-node/i, process: 'node' },
  { pattern: /python[23]?[\s.]|pip |conda |pytest/i, process: 'python' },
  { pattern: /git (push|pull|commit|merge|rebase|clone|fetch|log|diff|stash)/i, process: 'git' },
  { pattern: /docker |docker-compose|podman /i, process: 'docker' },
  { pattern: /ssh |scp |sftp /i, process: 'ssh' },
  { pattern: /vim |nvim |vi /i, process: 'vim' },
  { pattern: /make |cmake |cargo build|go build|gcc |g\+\+|msbuild/i, process: 'build' },
  { pattern: /jest |vitest |mocha |pytest |rspec|cargo test/i, process: 'test' },
  { pattern: /psql|mysql|mongo|redis-cli|sqlite/i, process: 'database' },
  { pattern: /pwsh|powershell/i, process: 'powershell' },
];

/* ===========================
   DOM REFS
   =========================== */
const $ = (id) => document.getElementById(id);

const tabBar          = $('tabBar');
const featureBtn      = $('featureBtn');
const featureMenu     = $('featureMenu');
const termArea        = $('terminalArea');
const homePage        = $('homePage');
const statusText      = $('statusText');
const statusShell     = $('statusShell');
const statusPanes     = $('statusPanes');
const ctxMenu         = $('contextMenu');
const tabCtxMenu      = $('tabContextMenu');
const folderCtxMenu   = $('folderContextMenu');
const searchOverlay   = $('searchOverlay');
const searchInput     = $('searchInput');
const welcomeOverlay  = $('welcomeOverlay');
const commandPalette  = $('commandPalette');
const cmdBackdrop     = $('commandPaletteBackdrop');
const cmdInput        = $('commandPaletteInput');
const cmdList         = $('commandPaletteList');
const broadcastInd    = $('broadcastIndicator');
const statusCwd       = $('statusCwd');
const sidePanel       = $('sidePanel');
const quickCmdList    = $('quickCmdList');
const quickCmdDialog  = $('quickCmdDialog');
const quickCmdBackdrop= $('quickCmdBackdrop');
const themeToggle     = $('themeToggle');
const mainContent     = termArea?.parentElement;
const playgroundPage  = $('playgroundPage');
const playgroundBtn   = $('playgroundBtn');
const liveRegion      = $('liveRegion');

/* ===========================
   HELPERS
   =========================== */
function newPaneId()   { return `pane-${++paneCounter}`; }
function newTabId()    { return `tab-${++tabCounter}`; }
function newFolderId() { return `folder-${++folderCounter}`; }

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function updateStatus(text) { if (statusText) statusText.textContent = text; }
function announce(text) { if (liveRegion) { liveRegion.textContent = ''; requestAnimationFrame(() => { liveRegion.textContent = text; }); } }

/* ---- Toast notifications ---- */
const TOAST_ICONS = { info: '\u2139\uFE0F', success: '\u2705', warning: '\u26A0\uFE0F', error: '\u274C' };

function showToast(message, type = 'info', duration = 3000) {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${escapeHtml(message)}</span>`;
  toast.addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);
  // Auto-dismiss
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
  // Limit to 5 visible toasts
  const toasts = container.querySelectorAll('.toast:not(.toast-out)');
  if (toasts.length > 5) dismissToast(toasts[0]);
}

function dismissToast(toast) {
  if (toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('toast-out');
  toast.addEventListener('animationend', () => { toast.remove(); }, { once: true });
  // Fallback in case animationend doesn't fire
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
}

function updateStatusBar() {
  const tab = tabs.get(activeTabId);
  const tc = $('statusTabCount');
  if (tc) {
    const total = tabs.size;
    let hiddenCount = 0;
    for (const [, t] of tabs) { if (t.hidden) hiddenCount++; }
    tc.textContent = hiddenCount > 0 ? `${total} tabs (${hiddenCount} hidden)` : `${total} tab${total !== 1 ? 's' : ''}`;
  }
  if (!tab) return;
  if (statusShell) statusShell.textContent = tab.shellName || 'shell';
  const n = countPanes(tab.paneTree);
  if (statusPanes) statusPanes.textContent = `${n} pane${n !== 1 ? 's' : ''}`;
  if (statusCwd) statusCwd.textContent = tab.cwd || '';
}

function countPanes(node) {
  if (!node) return 0;
  if (node.type === 'pane') return 1;
  return node.children.reduce((s, c) => s + countPanes(c), 0);
}

/* ===========================
   TAB ORDER
   =========================== */
function addTabToOrder(tabId) {
  tabOrder.push({ type: 'tab', id: tabId });
}

function removeFromOrder(id) {
  tabOrder = tabOrder.filter(item => item.id !== id);
}

// Full tab order including hidden tabs (for home page)
function getAllTabOrder() {
  const pinned = [];
  const rest = [];
  for (const item of tabOrder) {
    if (item.type === 'folder') {
      const folder = folders.get(item.id);
      if (!folder) continue;
      rest.push({ type: 'folder', id: item.id });
      if (!folder.collapsed) {
        for (const tid of folder.tabIds) {
          rest.push({ type: 'tab', id: tid, inFolder: item.id });
        }
      }
    } else if (item.type === 'tab') {
      const tab = tabs.get(item.id);
      if (tab && !tab.folderId) {
        if (tab.pinned) pinned.push({ type: 'tab', id: item.id });
        else rest.push({ type: 'tab', id: item.id });
      }
    }
  }
  return [...pinned, ...rest];
}

// Tab order excluding hidden tabs (for tab bar)
function getVisibleTabOrder() {
  const pinned = [];
  const rest = [];
  for (const item of tabOrder) {
    if (item.type === 'folder') {
      const folder = folders.get(item.id);
      if (!folder) continue;
      // Only show folder if it has visible (non-hidden) tabs
      const visibleTabIds = folder.tabIds.filter(tid => { const t = tabs.get(tid); return t && !t.hidden; });
      if (visibleTabIds.length === 0 && folder.tabIds.length > 0) continue; // all tabs hidden
      rest.push({ type: 'folder', id: item.id });
      if (!folder.collapsed) {
        for (const tid of visibleTabIds) {
          rest.push({ type: 'tab', id: tid, inFolder: item.id });
        }
      }
    } else if (item.type === 'tab') {
      const tab = tabs.get(item.id);
      if (tab && !tab.folderId && !tab.hidden) {
        if (tab.pinned) pinned.push({ type: 'tab', id: item.id });
        else rest.push({ type: 'tab', id: item.id });
      }
    }
  }
  return [...pinned, ...rest];
}

/* ===========================
   HOMEPAGE
   =========================== */
function showHomePage() {
  homePage.style.display = 'flex';
  if (mainContent) mainContent.style.display = 'none';
  if (playgroundPage) playgroundPage.style.display = 'none';
  if (playgroundBtn) playgroundBtn.classList.remove('active');
  activeTabId = null;
  updateHomeContent();
  renderTabs();
  announce('Home page');
}

function hideHomePage() {
  homePage.style.display = 'none';
  if (playgroundPage) playgroundPage.style.display = 'none';
  if (playgroundBtn) playgroundBtn.classList.remove('active');
  if (mainContent) mainContent.style.display = 'flex';
}

function showPlayground() {
  if (playgroundPage) playgroundPage.style.display = 'flex';
  if (playgroundBtn) playgroundBtn.classList.add('active');
  homePage.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';
  activeTabId = null;
  // Initialize 3D scene on first show
  if (!playground3D) _initPlayground3D();
  renderPlayground();
  renderTabs();
  announce('Playground — 3D virtual office');
}

function togglePlayground() {
  const isVisible = playgroundPage && playgroundPage.style.display !== 'none';
  if (isVisible) {
    showHomePage();
  } else {
    showPlayground();
  }
}

function updateHomeContent() {
  const sessionSection = $('homeSessionSection');
  const sessionList = $('homeSessionList');
  const emptyState = $('homeEmptyState');
  const hasTabs = tabs.size > 0;

  if (emptyState) emptyState.style.display = hasTabs ? 'none' : 'flex';
  if (sessionSection) sessionSection.style.display = hasTabs ? 'flex' : 'none';
  if (!hasTabs || !sessionList) return;

  sessionList.innerHTML = '';

  const order = getAllTabOrder(); // Use full order including hidden tabs for home page
  let currentFolderDiv = null;
  let currentFolderId = null;

  for (const item of order) {
    if (item.type === 'folder') {
      const folder = folders.get(item.id);
      if (!folder) continue;

      const folderDiv = document.createElement('div');
      folderDiv.className = 'home-folder-group';
      folderDiv.dataset.folderId = item.id;
      folderDiv.setAttribute('role', 'listitem');

      const hdr = document.createElement('div');
      hdr.className = `home-folder-header${folder.collapsed ? ' collapsed' : ''}`;
      hdr.innerHTML = `
        <span class="home-folder-chevron">${folder.collapsed ? '&#9654;' : '&#9660;'}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5C14.33 3.5 15 4.17 15 5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V3.5Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
        </svg>
        <span class="home-folder-label">${escapeHtml(folder.label)}</span>
        <span class="home-folder-count">${folder.tabIds.length}</span>
      `;

      // Click to collapse/expand
      hdr.addEventListener('click', (e) => {
        if (e.target.closest('.home-rename-input')) return;
        folder.collapsed = !folder.collapsed;
        updateHomeContent();
        scheduleSessionSave();
      });

      // Double-click to rename folder on home page
      hdr.addEventListener('dblclick', (e) => {
        e.preventDefault(); e.stopPropagation();
        const lbl = hdr.querySelector('.home-folder-label');
        if (!lbl) return;
        const inp = document.createElement('input');
        inp.className = 'home-rename-input'; inp.value = folder.label; inp.maxLength = 30;
        lbl.replaceWith(inp); inp.focus(); inp.select();
        const done = () => { folder.label = inp.value.trim() || folder.label; updateHomeContent(); scheduleSessionSave(); };
        inp.addEventListener('blur', done);
        inp.addEventListener('click', (ev) => ev.stopPropagation());
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = folder.label; inp.blur(); } });
      });

      // Right-click context menu on home page folder
      hdr.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        showHomeFolderContextMenu(e.clientX, e.clientY, item.id);
      });

      // DnD: drop tabs into folder
      setupHomeFolderDnD(folderDiv, hdr, item.id);

      folderDiv.appendChild(hdr);
      const content = document.createElement('div');
      content.className = 'home-folder-content';
      if (folder.collapsed) content.style.display = 'none';
      folderDiv.appendChild(content);
      currentFolderDiv = folder.collapsed ? null : content;
      currentFolderId = item.id;
      sessionList.appendChild(folderDiv);

    } else if (item.type === 'tab') {
      const tab = tabs.get(item.id);
      if (!tab) continue;

      const card = buildTabCard(item.id, tab);

      if (item.inFolder && currentFolderDiv) {
        currentFolderDiv.appendChild(card);
      } else {
        currentFolderDiv = null;
        currentFolderId = null;
        sessionList.appendChild(card);
      }
    }
  }
}

function setupHomeFolderDnD(folderDiv, hdr, folderId) {
  hdr.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    hdr.classList.add('drag-over-inside');
  });
  hdr.addEventListener('dragleave', () => hdr.classList.remove('drag-over-inside'));
  hdr.addEventListener('drop', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault(); hdr.classList.remove('drag-over-inside');
    const data = e.dataTransfer.getData('text/plain');
    if (data && tabs.has(data)) {
      moveTabToFolder(data, folderId);
      updateHomeContent();
    }
  });
}

/* ---- Home page context menus ---- */
function showHomeTabContextMenu(x, y, tabId) {
  hideAllContextMenus();
  const menu = $('homeContextMenu');
  if (!menu) return;
  const tab = tabs.get(tabId);
  if (!tab) return;
  menu.dataset.targetId = tabId;
  menu.dataset.targetType = 'tab';
  // Show tab items, hide folder items
  menu.querySelectorAll('[data-scope]').forEach(el => {
    el.style.display = el.dataset.scope === 'folder' ? 'none' : '';
  });
  // Update lock label
  const lockItem = menu.querySelector('[data-action="home-lock"]');
  if (lockItem) { lockItem.textContent = tab.locked ? 'Unlock Terminal' : 'Lock Terminal'; lockItem.style.display = ''; }
  // Update hide label
  const hideItem = menu.querySelector('[data-action="home-hide"]');
  if (hideItem) { hideItem.textContent = tab.hidden ? 'Show in Tab Bar' : 'Hide from Tab Bar'; hideItem.style.display = ''; }
  const closeItem = menu.querySelector('[data-action="home-close"]');
  if (closeItem) closeItem.style.display = tab.locked ? 'none' : '';
  const vw = window.innerWidth, vh = window.innerHeight;
  menu.style.left = `${Math.min(x, vw - 200)}px`;
  menu.style.top = `${Math.min(y, vh - 200)}px`;
  menu.classList.add('visible');
}

function showHomeFolderContextMenu(x, y, folderId) {
  hideAllContextMenus();
  const menu = $('homeContextMenu');
  if (!menu) return;
  menu.dataset.targetId = folderId;
  menu.dataset.targetType = 'folder';
  // Hide tab-only items, show folder-only items
  menu.querySelectorAll('[data-scope]').forEach(el => {
    const scope = el.dataset.scope;
    el.style.display = (scope === 'tab') ? 'none' : '';
  });
  menu.querySelectorAll('[data-scope="folder"]').forEach(el => { el.style.display = ''; });
  // Also hide lock/close for folders
  const lockItem = menu.querySelector('[data-action="home-lock"]');
  if (lockItem) lockItem.style.display = 'none';
  const closeItem = menu.querySelector('[data-action="home-close"]');
  if (closeItem) closeItem.style.display = 'none';
  const vw = window.innerWidth, vh = window.innerHeight;
  menu.style.left = `${Math.min(x, vw - 200)}px`;
  menu.style.top = `${Math.min(y, vh - 200)}px`;
  menu.classList.add('visible');
}

// Wire up home context menu actions
(function setupHomeContextMenu() {
  const menu = $('homeContextMenu');
  if (!menu) return;
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.context-menu-item');
    if (!item) return;
    const action = item.dataset.action;
    const targetId = menu.dataset.targetId;
    const targetType = menu.dataset.targetType;

    if (targetType === 'tab') {
      const tab = tabs.get(targetId);
      if (action === 'home-rename') {
        // Find the card and trigger rename
        const card = document.querySelector(`.home-tab-card[data-tab-id="${targetId}"]`);
        if (card) card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      } else if (action === 'home-lock') {
        if (tab) { tab.locked = !tab.locked; renderTabs(); updateHomeContent(); scheduleSessionSave(); }
      } else if (action === 'home-hide') {
        if (tab) { tab.hidden = !tab.hidden; renderTabs(); updateHomeContent(); scheduleSessionSave(); }
      } else if (action === 'home-close') {
        closeTab(targetId);
        updateHomeContent();
      }
    } else if (targetType === 'folder') {
      if (action === 'home-rename') {
        const hdr = document.querySelector(`.home-folder-group[data-folder-id="${targetId}"] .home-folder-header`);
        if (hdr) hdr.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      } else if (action === 'home-ungroup') {
        ungroupFolder(targetId);
        updateHomeContent();
      } else if (action === 'home-delete') {
        deleteFolder(targetId);
        updateHomeContent();
      }
    }
    menu.classList.remove('visible');
  });
})();

function buildTabCard(tabId, tab) {
  const card = document.createElement('div');
  card.className = `home-tab-card${tab.hidden ? ' home-tab-hidden' : ''}`;
  card.draggable = true;
  card.dataset.tabId = tabId;
  card.setAttribute('role', 'listitem');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `${tab.label}${tab.pinned ? ' (pinned)' : ''}${tab.locked ? ' (locked)' : ''}`);

  const colorBar = tab.color ? `<div class="home-tab-card-color" style="background: var(--${tab.color})"></div>` : '';
  const shellInfo = tab.shellName ? `<span class="home-tab-card-shell">${escapeHtml(tab.shellName)}</span>` : '';
  const hiddenIcon = tab.hidden ? '<span class="home-tab-card-lock" title="Hidden from tab bar" style="opacity:0.5">&#128065;</span>' : '';
  const pinIcon = tab.pinned ? '<span class="home-tab-card-lock" title="Pinned">&#128204;</span>' : '';
  const lockIcon = tab.locked ? '<span class="home-tab-card-lock" title="Locked">&#128274;</span>' : '';
  const processTag = tab.detectedProcess && tab.detectedProcess !== 'idle'
    ? `<span class="home-tab-card-shell" style="color:var(--green)">${escapeHtml(tab.detectedProcess)}</span>` : '';
  const cwdText = tab.cwd
    ? `<div class="home-tab-card-path">${escapeHtml(tab.cwd)}</div>`
    : '<div class="home-tab-card-path home-tab-card-path-dim">~</div>';

  card.innerHTML = `
    ${colorBar}
    <div class="home-tab-card-body">
      <div class="home-tab-card-header">
        <span class="home-tab-card-icon">&gt;_</span>
        <span class="home-tab-card-label">${escapeHtml(tab.label)}</span>
        ${hiddenIcon}${pinIcon}${lockIcon}${processTag}${shellInfo}
      </div>
      ${cwdText}
    </div>
  `;

  // Click to switch
  card.addEventListener('click', (e) => {
    if (e.target.closest('.home-rename-input')) return;
    switchTab(tabId);
    if (tab.hidden) {
      showToast('This tab is hidden from the tab bar. Right-click to unhide.', 'info', 3000);
    }
  });

  // Double-click to rename
  card.addEventListener('dblclick', (e) => {
    e.preventDefault();
    const lbl = card.querySelector('.home-tab-card-label');
    if (!lbl) return;
    const inp = document.createElement('input');
    inp.className = 'home-rename-input'; inp.value = tab.label; inp.maxLength = 30;
    lbl.replaceWith(inp); inp.focus(); inp.select();
    const done = () => { tab.label = inp.value.trim() || tab.label; updateHomeContent(); renderTabs(); scheduleSessionSave(); };
    inp.addEventListener('blur', done);
    inp.addEventListener('click', (ev) => ev.stopPropagation());
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') inp.blur(); if (ev.key === 'Escape') { inp.value = tab.label; inp.blur(); } });
  });

  // Right-click context menu on home page tab card
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault(); e.stopPropagation();
    showHomeTabContextMenu(e.clientX, e.clientY, tabId);
  });

  // Keyboard: Enter to switch, Delete to close
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') switchTab(tabId);
    if (e.key === 'Delete' && !tab.locked && !tab.pinned) closeTab(tabId);
  });

  // DnD: reorder on home page
  card.addEventListener('dragstart', (e) => {
    card.classList.add('dragging');
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
    document.querySelectorAll('.home-tab-card').forEach(c => {
      c.classList.remove('drag-over-above', 'drag-over-below');
    });
  });
  card.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const rect = card.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    card.classList.toggle('drag-over-above', e.clientY < mid);
    card.classList.toggle('drag-over-below', e.clientY >= mid);
  });
  card.addEventListener('dragleave', () => {
    card.classList.remove('drag-over-above', 'drag-over-below');
  });
  card.addEventListener('drop', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    card.classList.remove('drag-over-above', 'drag-over-below');
    const fromId = e.dataTransfer.getData('text/plain');
    if (!fromId || fromId === tabId) return;

    if (tabs.has(fromId)) {
      // Move tab relative to this card
      const fromTab = tabs.get(fromId);
      // Remove from old folder
      if (fromTab.folderId) {
        const oldFolder = folders.get(fromTab.folderId);
        if (oldFolder) oldFolder.tabIds = oldFolder.tabIds.filter(id => id !== fromId);
      }
      tabOrder = tabOrder.filter(i => !(i.type === 'tab' && i.id === fromId));

      // If target is in a folder, insert into that folder
      if (tab.folderId) {
        fromTab.folderId = tab.folderId;
        const folder = folders.get(tab.folderId);
        if (folder) {
          const idx = folder.tabIds.indexOf(tabId);
          const rect = card.getBoundingClientRect();
          const insertIdx = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
          folder.tabIds.splice(insertIdx, 0, fromId);
        }
      } else {
        fromTab.folderId = null;
        const idx = tabOrder.findIndex(i => i.type === 'tab' && i.id === tabId);
        const rect = card.getBoundingClientRect();
        const insertIdx = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
        tabOrder.splice(insertIdx < 0 ? tabOrder.length : insertIdx, 0, { type: 'tab', id: fromId });
      }

      renderTabs();
      updateHomeContent();
      scheduleSessionSave();
    }
  });

  return card;
}

$('homeNewTab')?.addEventListener('click', () => createTab());
$('homeNewFolder')?.addEventListener('click', () => createFolder());
$('homeCommandPalette')?.addEventListener('click', () => toggleCommandPalette());
$('homeNewTab2')?.addEventListener('click', () => createTab());
$('homeNewFolder2')?.addEventListener('click', () => createFolder());

// Drop zone on session list — allows dragging a tab out of a folder onto the empty area
(function setupSessionListDropZone() {
  const sl = $('homeSessionList');
  if (!sl) return;
  sl.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    if (e.target.closest('.home-tab-card') || e.target.closest('.home-folder-header')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    sl.classList.add('drag-over-list');
  });
  sl.addEventListener('dragleave', (e) => {
    if (!sl.contains(e.relatedTarget)) sl.classList.remove('drag-over-list');
  });
  sl.addEventListener('drop', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    sl.classList.remove('drag-over-list');
    if (e.target.closest('.home-tab-card') || e.target.closest('.home-folder-header')) return;
    e.preventDefault();
    const fromId = e.dataTransfer.getData('text/plain');
    if (fromId && tabs.has(fromId)) {
      moveTabToFolder(fromId, null);
      updateHomeContent();
    }
  });
})();

/* ===========================
   FOLDERS
   =========================== */
function createFolder(label) {
  const folderId = newFolderId();
  folders.set(folderId, { label: label || `Folder ${folderCounter}`, collapsed: false, tabIds: [] });
  tabOrder.push({ type: 'folder', id: folderId });
  renderTabs();
  scheduleSessionSave();
  return folderId;
}

function moveTabToFolder(tabId, folderId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  if (tab.folderId) {
    const old = folders.get(tab.folderId);
    if (old) old.tabIds = old.tabIds.filter(id => id !== tabId);
  }

  tabOrder = tabOrder.filter(item => !(item.type === 'tab' && item.id === tabId));

  if (folderId) {
    const folder = folders.get(folderId);
    if (folder) { folder.tabIds.push(tabId); tab.folderId = folderId; }
  } else {
    tab.folderId = null;
    addTabToOrder(tabId);
  }
  renderTabs();
  scheduleSessionSave();
}

function ungroupFolder(folderId) {
  const folder = folders.get(folderId);
  if (!folder) return;
  const idx = tabOrder.findIndex(item => item.type === 'folder' && item.id === folderId);
  const items = folder.tabIds.map(tid => {
    const tab = tabs.get(tid);
    if (tab) tab.folderId = null;
    return { type: 'tab', id: tid };
  });
  if (idx !== -1) tabOrder.splice(idx, 1, ...items);
  else tabOrder.push(...items);
  folders.delete(folderId);
  renderTabs();
  scheduleSessionSave();
}

function deleteFolder(folderId, skipConfirm) {
  const folder = folders.get(folderId);
  if (!folder) return;
  if (!skipConfirm && folder.tabIds.length > 0) {
    const count = folder.tabIds.length;
    if (!confirm(`Delete folder "${folder.label}" and close ${count} terminal${count !== 1 ? 's' : ''}?`)) return;
  }
  for (const tid of [...folder.tabIds]) closeTab(tid);
  removeFromOrder(folderId);
  folders.delete(folderId);
  renderTabs();
  scheduleSessionSave();
}

function toggleFolderCollapse(folderId) {
  const f = folders.get(folderId);
  if (f) { f.collapsed = !f.collapsed; renderTabs(); }
}

/* ===========================
   TABS
   =========================== */
function createTab(inFolderId, options) {
  // Guard: ignore MouseEvent passed as argument from click handlers
  if (inFolderId && typeof inFolderId !== 'string') inFolderId = undefined;
  const opts = options || {};

  const tabId = newTabId();
  const paneId = newPaneId();
  const pane = createPaneNode(paneId, opts.cwd);

  const label = opts.label || `Terminal ${tabCounter}`;
  tabs.set(tabId, {
    label,
    paneTree: pane,
    shellName: '',
    color: opts.color || null,
    folderId: inFolderId || null,
    cwd: opts.cwd || null,
    locked: false,
    pinned: false,
    hidden: false,
    detectedProcess: 'idle',
  });

  if (inFolderId) {
    const folder = folders.get(inFolderId);
    if (folder) folder.tabIds.push(tabId);
  } else {
    addTabToOrder(tabId);
  }

  renderTabs();
  switchTab(tabId);
  dismissWelcome();
  scheduleSessionSave();
  return tabId;
}

function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  if (tab.locked) { announce('Terminal is locked and cannot be closed'); showToast('Terminal is locked', 'warning'); return; }
  if (tab.pinned) { announce('Pinned tab cannot be closed'); showToast('Unpin the tab first', 'warning'); return; }

  // Save to closure stack before destroying (for reopen)
  tabClosureStack.push({ label: tab.label, color: tab.color, folderId: tab.folderId, cwd: tab.cwd, shellName: tab.shellName });
  if (tabClosureStack.length > 10) tabClosureStack.shift();

  try { destroyTree(tab.paneTree); } catch {}

  if (tab.folderId) {
    const folder = folders.get(tab.folderId);
    if (folder) {
      folder.tabIds = folder.tabIds.filter(id => id !== tabId);
      if (folder.tabIds.length === 0) {
        removeFromOrder(tab.folderId);
        folders.delete(tab.folderId);
      }
    }
  }

  removeFromOrder(tabId);
  tabs.delete(tabId);

  const isHome = homePage.style.display !== 'none';

  if (activeTabId === tabId) {
    const remaining = [...tabs.keys()];
    if (remaining.length > 0) {
      switchTab(remaining[remaining.length - 1]);
    } else {
      activeTabId = null;
      termArea.innerHTML = '';
      showHomePage();
      renderTabs();
      scheduleSessionSave();
      return;
    }
  }
  renderTabs();
  if (isHome) updateHomeContent();
  scheduleSessionSave();
}

function switchTab(tabId) {
  if (activeTabId === tabId) return;
  activeTabId = tabId;
  focusedPaneId = null;
  hideHomePage();
  renderTabs();
  renderTerminalArea();
  updateStatusBar();
  // Clear activity dot on the now-active tab
  const tabEl = tabBar.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabEl) tabEl.classList.remove('tab-activity');
  scheduleSessionSave();
}

/* ===========================
   TAB RENDERING
   =========================== */
function renderTabs() {
  tabBar.querySelectorAll('.tab, .folder-group').forEach(el => el.remove());

  const order = getVisibleTabOrder();
  let currentFolderEl = null;

  for (const item of order) {
    if (item.type === 'folder') {
      const folder = folders.get(item.id);
      if (!folder) continue;

      const groupEl = document.createElement('div');
      groupEl.className = 'folder-group';
      groupEl.dataset.folderId = item.id;

      // Folder handle goes on the LEFT
      const hdr = document.createElement('div');
      hdr.className = `folder-header${folder.collapsed ? ' collapsed' : ''}`;
      hdr.innerHTML = `
        <svg class="folder-icon" width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5C14.33 3.5 15 4.17 15 5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V3.5Z"
            stroke="currentColor" stroke-width="1.2" fill="${folder.collapsed ? 'currentColor' : 'none'}" opacity="${folder.collapsed ? '0.3' : '1'}"/>
        </svg>
        <span class="folder-label">${escapeHtml(folder.label)}</span>
        <span class="folder-count">${folder.tabIds.length}</span>
      `;
      hdr.title = `${folder.label} (${folder.tabIds.length} tabs) — click to ${folder.collapsed ? 'expand' : 'collapse'}`;
      hdr.addEventListener('click', () => toggleFolderCollapse(item.id));
      hdr.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showFolderContextMenu(e.clientX, e.clientY, item.id); });
      hdr.addEventListener('dblclick', (e) => { e.preventDefault(); e.stopPropagation(); startRenameFolder(hdr, item.id); });
      hdr.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; hdr.classList.add('drag-over'); });
      hdr.addEventListener('dragleave', () => hdr.classList.remove('drag-over'));
      hdr.addEventListener('drop', (e) => {
        if (e.dataTransfer.types.includes('Files')) return;
        e.preventDefault(); hdr.classList.remove('drag-over');
        const fromId = e.dataTransfer.getData('text/plain');
        if (fromId && tabs.has(fromId)) moveTabToFolder(fromId, item.id);
      });
      groupEl.appendChild(hdr);

      // Child tabs go on the right
      const content = document.createElement('div');
      content.className = 'folder-content';
      groupEl.appendChild(content);
      currentFolderEl = folder.collapsed ? null : content;

      tabBar.insertBefore(groupEl, $('tabInsertPoint'));

    } else if (item.type === 'tab') {
      const tab = tabs.get(item.id);
      if (!tab) continue;
      const el = buildTabEl(item.id, tab, item.inFolder);
      if (item.inFolder && currentFolderEl) currentFolderEl.appendChild(el);
      else tabBar.insertBefore(el, $('tabInsertPoint'));
    }
  }
  // Keep tab count in sync
  const tc = $('statusTabCount');
  if (tc) {
    const total = tabs.size;
    let hiddenCount = 0;
    for (const [, t] of tabs) { if (t.hidden) hiddenCount++; }
    tc.textContent = hiddenCount > 0 ? `${total} tab${total !== 1 ? 's' : ''} (${hiddenCount} hidden)` : `${total} tab${total !== 1 ? 's' : ''}`;
  }
}

function buildTabEl(tabId, tab, inFolder) {
  const el = document.createElement('div');
  el.className = `tab${tabId === activeTabId ? ' active' : ''}${inFolder ? ' in-folder' : ''}${tab.pinned ? ' pinned' : ''}`;
  el.draggable = !tab.pinned;
  el.dataset.tabId = tabId;

  const colorBar = tab.color ? `<span class="tab-color-bar" style="background: var(--${tab.color})"></span>` : '';
  const pinIco = tab.pinned ? '<span class="tab-pin" title="Pinned" style="font-size:10px;opacity:0.7">&#128204;</span>' : '';
  const lockIco = tab.locked ? '<span class="tab-lock" title="Locked">&#128274;</span>' : '';
  const closeBtn = (tab.locked || tab.pinned) ? '' : '<span class="tab-close">&times;</span>';
  el.innerHTML = `${colorBar}<span class="tab-icon">&gt;_</span>${pinIco}<span class="tab-label">${escapeHtml(tab.label)}</span>${lockIco}${closeBtn}`;
  el.setAttribute('role', 'tab');
  el.setAttribute('aria-selected', tabId === activeTabId ? 'true' : 'false');
  el.setAttribute('aria-label', `${tab.label}${tab.locked ? ' (locked)' : ''}`);

  el.addEventListener('click', (e) => { if (!e.target.closest('.tab-close')) switchTab(tabId); });
  const closeEl = el.querySelector('.tab-close');
  if (closeEl) closeEl.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); closeTab(tabId); });
  el.addEventListener('dblclick', (e) => { e.preventDefault(); startRenameTab(el, tabId); });
  el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showTabContextMenu(e.clientX, e.clientY, tabId); });

  el.addEventListener('dragstart', (e) => { el.classList.add('dragging'); e.dataTransfer.setData('text/plain', tabId); e.dataTransfer.effectAllowed = 'move'; });
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over')); });
  el.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drag-over'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => { if (e.dataTransfer.types.includes('Files')) return; e.preventDefault(); el.classList.remove('drag-over'); const fid = e.dataTransfer.getData('text/plain'); if (fid && fid !== tabId) reorderTabs(fid, tabId); });
  return el;
}

function startRenameTab(el, tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  manuallyRenamed.add(tabId);
  const lbl = el.querySelector('.tab-label');
  const inp = document.createElement('input');
  inp.className = 'tab-label-input'; inp.value = tab.label; inp.maxLength = 30;
  lbl.replaceWith(inp); inp.focus(); inp.select();
  const done = () => { tab.label = inp.value.trim() || tab.label; renderTabs(); scheduleSessionSave(); };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = tab.label; inp.blur(); } });
}

function startRenameFolder(hdr, folderId) {
  const folder = folders.get(folderId);
  if (!folder) return;
  // Try inline rename (home page has .folder-label, tab bar uses prompt fallback)
  const lbl = hdr.querySelector('.folder-label') || hdr.querySelector('.home-folder-label');
  if (lbl) {
    const inp = document.createElement('input');
    inp.className = 'tab-label-input'; inp.value = folder.label; inp.maxLength = 30;
    lbl.replaceWith(inp); inp.focus(); inp.select();
    const done = () => { folder.label = inp.value.trim() || folder.label; renderTabs(); scheduleSessionSave(); };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = folder.label; inp.blur(); } });
  } else {
    // Tab bar compact mode — use native prompt
    const newName = prompt('Rename folder:', folder.label);
    if (newName && newName.trim()) {
      folder.label = newName.trim();
      renderTabs();
      scheduleSessionSave();
    }
  }
}

function reorderTabs(fromId, toId) {
  const fromTab = tabs.get(fromId), toTab = tabs.get(toId);
  if (!fromTab || !toTab) return;

  if (fromTab.folderId && fromTab.folderId === toTab.folderId) {
    const folder = folders.get(fromTab.folderId);
    if (folder) { const a = folder.tabIds.indexOf(fromId), b = folder.tabIds.indexOf(toId); if (a !== -1 && b !== -1) { folder.tabIds.splice(a, 1); folder.tabIds.splice(b, 0, fromId); } }
    renderTabs(); scheduleSessionSave(); return;
  }

  const fi = tabOrder.findIndex(i => i.type === 'tab' && i.id === fromId);
  const ti = tabOrder.findIndex(i => i.type === 'tab' && i.id === toId);
  if (fi !== -1 && ti !== -1) { const [m] = tabOrder.splice(fi, 1); tabOrder.splice(ti, 0, m); }
  renderTabs();
  scheduleSessionSave();
}

/* ===========================
   CONTEXT MENUS
   =========================== */
let contextTabId = null;
let contextPaneId = null;
let contextFolderId = null;

function hideAllContextMenus() {
  ctxMenu.classList.remove('visible');
  tabCtxMenu.classList.remove('visible');
  folderCtxMenu.classList.remove('visible');
  const homeCtx = $('homeContextMenu');
  if (homeCtx) homeCtx.classList.remove('visible');
  const folderPicker = $('folderPickerMenu');
  if (folderPicker) folderPicker.remove();
}

document.addEventListener('click', () => hideAllContextMenus());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideAllContextMenus(); });

// Pane context menu
function showContextMenu(x, y, paneId) {
  contextPaneId = paneId; hideAllContextMenus();
  const vw = window.innerWidth, vh = window.innerHeight;
  ctxMenu.style.left = `${Math.min(x, vw - 200)}px`;
  ctxMenu.style.top = `${Math.min(y, vh - 180)}px`;
  ctxMenu.classList.add('visible');
}

ctxMenu.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const a = item.dataset.action;
    if (a === 'split-h') splitPane(contextPaneId, 'horizontal');
    else if (a === 'split-v') splitPane(contextPaneId, 'vertical');
    else if (a === 'close') closePaneById(contextPaneId);
    else if (a === 'search') toggleSearch();
    ctxMenu.classList.remove('visible');
  });
});

// Tab context menu
function showTabContextMenu(x, y, tabId) {
  contextTabId = tabId; hideAllContextMenus();
  const tab = tabs.get(tabId);
  // Update lock menu item text
  const lockItem = $('lockTabMenuItem');
  if (lockItem && tab) lockItem.textContent = tab.locked ? 'Unlock Terminal' : 'Lock Terminal';
  // Update pin menu item text
  const pinItem = $('pinTabMenuItem');
  if (pinItem && tab) pinItem.textContent = tab.pinned ? 'Unpin Tab' : 'Pin Tab';
  const vw = window.innerWidth, vh = window.innerHeight;
  tabCtxMenu.style.left = `${Math.min(x, vw - 220)}px`;
  tabCtxMenu.style.top = `${Math.min(y, vh - 250)}px`;
  tabCtxMenu.classList.add('visible');
}

tabCtxMenu.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const a = item.dataset.action;
    if (a === 'rename-tab') { const el = tabBar.querySelector(`[data-tab-id="${contextTabId}"]`); if (el) { manuallyRenamed.add(contextTabId); startRenameTab(el, contextTabId); } }
    else if (a === 'duplicate-tab') { duplicateTab(contextTabId); }
    else if (a === 'pin-tab') { togglePinTab(contextTabId); }
    else if (a === 'lock-tab') { const t = tabs.get(contextTabId); if (t) { t.locked = !t.locked; renderTabs(); scheduleSessionSave(); announce(t.locked ? 'Terminal locked' : 'Terminal unlocked'); } }
    else if (a === 'move-to-folder') { e.stopPropagation(); showMoveToFolderMenu(contextTabId); return; }
    else if (a === 'clear-terminal') { clearTerminal(contextTabId); }
    else if (a === 'export-output') { exportTerminalOutput(contextTabId); }
    else if (a === 'hide-tab') { hideTab(contextTabId); }
    else if (a === 'show-hidden') { showHiddenTabsMenu(); }
    else if (a === 'close-tab') closeTab(contextTabId);
    else if (a === 'close-others') closeOtherTabs(contextTabId);
    else if (a === 'close-tabs-right') closeTabsToRight(contextTabId);
    tabCtxMenu.classList.remove('visible');
  });
});

document.querySelectorAll('#tabColorRow .tab-color-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    if (contextTabId) { const tab = tabs.get(contextTabId); if (tab) { tab.color = sw.dataset.color || null; renderTabs(); scheduleSessionSave(); } }
    tabCtxMenu.classList.remove('visible');
  });
});

function showMoveToFolderMenu(tabId) {
  // Hide the original context menu and show a new one in its place with folder options
  const rect = tabCtxMenu.getBoundingClientRect();
  tabCtxMenu.classList.remove('visible');

  // Build the folder picker as a new context menu
  const picker = document.createElement('div');
  picker.className = 'context-menu visible';
  picker.style.cssText = `left:${rect.left}px; top:${rect.top}px; opacity:1; transform:scale(1); pointer-events:auto;`;
  picker.id = 'folderPickerMenu';

  const header = document.createElement('div');
  header.className = 'context-menu-label';
  header.textContent = 'Move to Folder';
  picker.appendChild(header);

  const sep0 = document.createElement('div'); sep0.className = 'context-menu-sep';
  picker.appendChild(sep0);

  // "+ New Folder" option
  const nf = document.createElement('div'); nf.className = 'context-menu-item';
  nf.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right:6px;vertical-align:middle;flex-shrink:0"><line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>New Folder';
  nf.addEventListener('click', (e) => {
    e.stopPropagation();
    const fid = createFolder();
    moveTabToFolder(tabId, fid);
    picker.remove();
  });
  picker.appendChild(nf);

  // "Remove from Folder" option if in a folder
  const tab = tabs.get(tabId);
  if (tab?.folderId) {
    const rf = document.createElement('div'); rf.className = 'context-menu-item';
    rf.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right:6px;vertical-align:middle;flex-shrink:0"><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Remove from Folder';
    rf.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTabToFolder(tabId, null);
      picker.remove();
    });
    picker.appendChild(rf);
  }

  // Existing folders
  if (folders.size > 0) {
    const sep = document.createElement('div'); sep.className = 'context-menu-sep';
    picker.appendChild(sep);
  }

  for (const [fid, folder] of folders) {
    if (tab?.folderId === fid) continue; // Skip the folder it's already in
    const fi = document.createElement('div'); fi.className = 'context-menu-item';
    fi.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right:6px;vertical-align:middle;flex-shrink:0"><path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5C14.33 3.5 15 4.17 15 5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V3.5Z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>${escapeHtml(folder.label)}`;
    fi.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTabToFolder(tabId, fid);
      picker.remove();
    });
    picker.appendChild(fi);
  }

  // Stop clicks inside the picker from closing it
  picker.addEventListener('click', (e) => e.stopPropagation());

  document.body.appendChild(picker);

  // Close when clicking outside
  const closePicker = (e) => {
    if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('mousedown', closePicker); }
  };
  // Use mousedown + setTimeout to avoid the current click event closing it immediately
  setTimeout(() => document.addEventListener('mousedown', closePicker), 0);

  // Also close on Escape
  const escHandler = (e) => { if (e.key === 'Escape') { picker.remove(); document.removeEventListener('keydown', escHandler); document.removeEventListener('mousedown', closePicker); } };
  document.addEventListener('keydown', escHandler);
}

// Folder context menu
function showFolderContextMenu(x, y, folderId) {
  contextFolderId = folderId; hideAllContextMenus();
  const vw = window.innerWidth, vh = window.innerHeight;
  folderCtxMenu.style.left = `${Math.min(x, vw - 200)}px`;
  folderCtxMenu.style.top = `${Math.min(y, vh - 120)}px`;
  folderCtxMenu.classList.add('visible');
}

folderCtxMenu.querySelectorAll('.context-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const a = item.dataset.action;
    if (a === 'rename-folder') { const h = tabBar.querySelector(`[data-folder-id="${contextFolderId}"] .folder-header`); if (h) startRenameFolder(h, contextFolderId); }
    else if (a === 'ungroup-folder') ungroupFolder(contextFolderId);
    else if (a === 'delete-folder') deleteFolder(contextFolderId);
    folderCtxMenu.classList.remove('visible');
  });
});

/* ===========================
   PANE TREE
   =========================== */
function createPaneNode(id, cwd, restoreTabId) {
  const node = { type: 'pane', id, terminal: null, fitAddon: null, searchAddon: null, cleanup: null, cwd: cwd || null, restoreTabId: restoreTabId || null };
  panes.set(id, node);
  return node;
}

function destroyTree(node) {
  if (node.type === 'pane') {
    if (node.cleanup) node.cleanup();
    if (node.terminal) node.terminal.dispose();
    window.termAPI.killPty(node.id);
    panes.delete(node.id);
  } else {
    node.children.forEach(destroyTree);
  }
}

function initPane(node, container) {
  const term = new Terminal({
    fontFamily: settings.fontFamily,
    fontSize, lineHeight: 1.25,
    cursorBlink: settings.cursorBlink,
    cursorStyle: settings.cursorStyle,
    cursorWidth: 2,
    scrollback: settings.scrollback,
    theme: THEME, allowProposedApi: true, macOptionIsMeta: true,
    drawBoldTextInBrightColors: true,
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  let searchAddon = null;
  if (SearchAddon) { searchAddon = new SearchAddon(); term.loadAddon(searchAddon); }
  if (WebglAddon) { try { const w = new WebglAddon(); w.onContextLoss(() => w.dispose()); term.loadAddon(w); } catch {} }

  term.open(container);
  requestAnimationFrame(() => { try { fitAddon.fit(); } catch {} });

  node.terminal = term;
  node.fitAddon = fitAddon;
  node.searchAddon = searchAddon;

  term.textarea?.addEventListener('focus', () => setFocusedPane(node.id));
  container.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e.clientX, e.clientY, node.id); });

  // Spawn the PTY shell (and optionally restore buffer first)
  const spawnPty = () => {
    const { cols, rows } = term;
    window.termAPI.createPty(node.id, cols, rows, node.cwd).then((result) => {
      if (result.error) {
        term.write(`\r\n\x1b[31mFailed to start shell: ${result.error}\x1b[0m\r\n`);
        updateStatus(`Error: ${result.error}`);
      } else {
        const tab = findTabForPane(node.id);
        if (tab) {
          tab.shellName = result.shell || 'shell';
          if (result.cwd) tab.cwd = result.cwd;
          updateStatusBar();
        }
        updateStatus('Ready');
      }
    });
  };

  // Restore saved terminal buffer content and spawn shell
  // When restoring, we strip shell startup clear-screen sequences so the
  // restored scrollback isn't wiped by PowerShell/bash init.
  let restoreGuardChunks = 0; // number of initial data chunks to filter
  if (node.restoreTabId) {
    const restoreId = node.restoreTabId;
    node.restoreTabId = null;
    window.termAPI.loadBuffer(restoreId).then((buf) => {
      if (buf) {
        const restored = buf.replace(/\r?\n/g, '\r\n');
        term.write(restored + '\r\n\x1b[2m--- session restored ---\x1b[0m\r\n');
        restoreGuardChunks = 8; // guard the first 8 data chunks from clearing
      }
      spawnPty();
    });
  } else {
    spawnPty();
  }

  let detectTimer = null;
  const offData = window.termAPI.onData(({ id, data }) => {
    if (id !== node.id) return;
    // Strip clear-screen sequences from the first few shell startup chunks
    // to prevent the restored scrollback content from being wiped.
    let chunk = data;
    if (restoreGuardChunks > 0) {
      restoreGuardChunks--;
      // Remove: CSI 2J (erase display), CSI H (cursor home), CSI ?1049h (alt screen),
      //         CSI 0J (erase below), CSI 3J (erase scrollback)
      chunk = chunk
        .replace(/\x1b\[\?1049[hl]/g, '')
        .replace(/\x1b\[[0-3]?J/g, '')
        .replace(/\x1b\[H/g, '')
        .replace(/\x1b\[0?;?0?H/g, '');
    }
    term.write(chunk);
    // Mark background tab activity
    for (const [tabId, t] of tabs) {
      if (treeContainsPane(t.paneTree, node.id) && tabId !== activeTabId) {
        const tabEl = tabBar.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabEl && !tabEl.classList.contains('tab-activity')) {
          tabEl.classList.add('tab-activity');
        }
        break;
      }
    }
    // Throttled process detection
    if (!detectTimer) {
      detectTimer = setTimeout(() => { detectTimer = null; }, 2000);
      const tab = findTabForPane(node.id);
      if (tab) {
        let found = 'idle';
        for (const { pattern, process } of PROCESS_PATTERNS) {
          if (pattern.test(data)) { found = process; break; }
        }
        if (found !== 'idle') tab.detectedProcess = found;
      }
    }
  });
  const offExit = window.termAPI.onExit(({ id, exitCode }) => { if (id === node.id) { term.write(`\r\n\x1b[2m[Process exited with code ${exitCode}]\x1b[0m\r\n`); updateStatus(`Process exited (${exitCode})`); } });
  const offCwd = window.termAPI.onCwdChange(({ id, cwd }) => {
    if (id === node.id) {
      const tab = findTabForPane(node.id);
      if (tab && tab.cwd !== cwd) {
        tab.cwd = cwd;
        // Auto-rename tab to directory basename (unless user manually renamed it)
        if (settings.autoRename) {
          const tabId = findTabIdForPane(node.id);
          if (tabId && !manuallyRenamed.has(tabId)) {
            const basename = cwd.split(/[/\\]/).filter(Boolean).pop();
            if (basename && tab.label !== basename) {
              tab.label = basename;
              renderTabs();
            }
          }
        }
        updateStatusBar();
        scheduleSessionSave();
      }
    }
  });

  const onDataDisp = term.onData((data) => {
    if (broadcastMode) { for (const id of getAllPaneIds()) window.termAPI.writePty(id, data); }
    else window.termAPI.writePty(node.id, data);
  });

  const onBellDisp = term.onBell(() => flashTabBell(node.id));
  node.cleanup = () => { offData(); offExit(); offCwd(); onDataDisp.dispose(); onBellDisp.dispose(); };
  if (!focusedPaneId) setFocusedPane(node.id);
  return node;
}

function findTabForPane(paneId) {
  for (const [, tab] of tabs) { if (treeContainsPane(tab.paneTree, paneId)) return tab; }
  return null;
}

function findTabIdForPane(paneId) {
  for (const [tabId, tab] of tabs) { if (treeContainsPane(tab.paneTree, paneId)) return tabId; }
  return null;
}

function treeContainsPane(node, paneId) {
  if (node.type === 'pane') return node.id === paneId;
  return node.children.some(c => treeContainsPane(c, paneId));
}

function setFocusedPane(paneId) {
  focusedPaneId = paneId;
  document.querySelectorAll('.pane').forEach(el => el.classList.toggle('focused', el.dataset.paneId === paneId));
  const node = panes.get(paneId);
  if (node?.terminal) node.terminal.focus();
}

/* ===========================
   RENDER TERMINAL AREA
   =========================== */
function renderTerminalArea() {
  termArea.innerHTML = '';
  const tab = tabs.get(activeTabId);
  if (!tab) return;

  termArea.appendChild(renderNode(tab.paneTree));

  requestAnimationFrame(() => {
    fitAll(tab.paneTree);
    if (!focusedPaneId || !panes.has(focusedPaneId)) {
      const first = findFirstPane(tab.paneTree);
      if (first) setFocusedPane(first.id);
    }
  });
}

function findFirstPane(node) {
  if (!node) return null;
  if (node.type === 'pane') return node;
  return findFirstPane(node.children[0]);
}

function renderNode(node) {
  if (node.type === 'pane') {
    const div = document.createElement('div');
    div.className = `pane${node.id === focusedPaneId ? ' focused' : ''}`;
    div.dataset.paneId = node.id;
    if (node.terminal) { div.appendChild(node.terminal.element); requestAnimationFrame(() => { try { node.fitAddon.fit(); } catch {} }); }
    else initPane(node, div);
    return div;
  }

  const ctr = document.createElement('div');
  ctr.className = `split-container ${node.direction}`;
  const c0 = renderNode(node.children[0]), c1 = renderNode(node.children[1]);
  const prop = node.direction === 'horizontal' ? 'width' : 'height';
  c0.style[prop] = `${node.sizes[0] * 100}%`; c1.style[prop] = `${node.sizes[1] * 100}%`;
  c0.style.flex = 'none'; c1.style.flex = 'none';

  const handle = document.createElement('div');
  handle.className = `resize-handle ${node.direction}`;
  setupResize(handle, node, c0, c1);

  ctr.appendChild(c0); ctr.appendChild(handle); ctr.appendChild(c1);
  return ctr;
}

function setupResize(handle, splitNode, el0, el1) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault(); handle.classList.add('active');
    document.body.style.cursor = splitNode.direction === 'horizontal' ? 'col-resize' : 'row-resize';
    const isH = splitNode.direction === 'horizontal';
    const startPos = isH ? e.clientX : e.clientY;
    const r0 = el0.getBoundingClientRect(), r1 = el1.getBoundingClientRect();
    const s0 = isH ? r0.width : r0.height, s1 = isH ? r1.width : r1.height;

    const onMove = (e) => {
      const d = (isH ? e.clientX : e.clientY) - startPos;
      const n0 = Math.max(60, s0 + d), n1 = Math.max(60, s1 - d), total = n0 + n1;
      splitNode.sizes = [n0 / total, n1 / total];
      const p = isH ? 'width' : 'height';
      el0.style[p] = `${splitNode.sizes[0] * 100}%`; el1.style[p] = `${splitNode.sizes[1] * 100}%`;
      const t = tabs.get(activeTabId);
      if (t) fitAll(t.paneTree);
    };
    const onUp = () => { handle.classList.remove('active'); document.body.style.cursor = ''; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function fitAll(node) {
  if (!node) return;
  if (node.type === 'pane') { if (node.fitAddon && node.terminal) { try { node.fitAddon.fit(); window.termAPI.resizePty(node.id, node.terminal.cols, node.terminal.rows); } catch {} } }
  else node.children.forEach(fitAll);
}

/* ===========================
   SPLIT LOGIC
   =========================== */
function splitPane(paneId, direction) {
  const tab = tabs.get(activeTabId);
  if (!tab) return;
  const result = findAndReplace(tab.paneTree, paneId, (paneNode) => ({
    type: 'split', direction, children: [paneNode, createPaneNode(newPaneId())], sizes: [0.5, 0.5],
  }));
  if (result) { tab.paneTree = result; renderTerminalArea(); updateStatusBar(); }
}

function findAndReplace(node, targetId, fn) {
  if (node.type === 'pane') return node.id === targetId ? fn(node) : null;
  for (let i = 0; i < node.children.length; i++) {
    const r = findAndReplace(node.children[i], targetId, fn);
    if (r) { node.children[i] = r; return node; }
  }
  return null;
}

function closePaneById(paneId) {
  const tab = tabs.get(activeTabId);
  if (!tab) return;
  if (tab.paneTree.type === 'pane' && tab.paneTree.id === paneId) { closeTab(activeTabId); return; }
  const result = removeFromTree(tab.paneTree, paneId);
  if (result) { tab.paneTree = result; focusedPaneId = null; renderTerminalArea(); updateStatusBar(); }
}

function removeFromTree(node, targetId) {
  if (node.type === 'pane') return null;
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].type === 'pane' && node.children[i].id === targetId) { destroyTree(node.children[i]); return node.children[1 - i]; }
  }
  for (let i = 0; i < node.children.length; i++) {
    const r = removeFromTree(node.children[i], targetId);
    if (r) { node.children[i] = r; return node; }
  }
  return null;
}

/* ===========================
   PANE NAVIGATION
   =========================== */
function getAllPaneIds() {
  const tab = tabs.get(activeTabId);
  if (!tab) return [];
  const ids = []; collectPaneIds(tab.paneTree, ids); return ids;
}

function collectPaneIds(node, ids) {
  if (node.type === 'pane') { ids.push(node.id); return; }
  node.children.forEach(c => collectPaneIds(c, ids));
}

function focusNextPane(delta) {
  const ids = getAllPaneIds();
  if (ids.length <= 1) return;
  const idx = ids.indexOf(focusedPaneId);
  setFocusedPane(ids[(idx + delta + ids.length) % ids.length]);
}

/* ===========================
   BROADCAST
   =========================== */
function toggleBroadcast() {
  broadcastMode = !broadcastMode;
  broadcastInd.classList.toggle('active', broadcastMode);
  document.body.classList.toggle('broadcast-active', broadcastMode);
  updateStatus(broadcastMode ? 'Broadcast ON — typing sends to all panes' : 'Ready');
}
broadcastInd.addEventListener('click', toggleBroadcast);

/* ===========================
   SEARCH
   =========================== */
let searchVisible = false;

function toggleSearch() {
  searchVisible = !searchVisible;
  searchOverlay.classList.toggle('visible', searchVisible);
  if (searchVisible) { searchInput.focus(); searchInput.select(); }
  else { searchInput.value = ''; const n = panes.get(focusedPaneId); if (n?.searchAddon) n.searchAddon.clearDecorations(); if (n?.terminal) n.terminal.focus(); }
}

const SEARCH_OPTS = {
  regex: false, caseSensitive: false, incremental: true,
  decorations: {
    matchBackground: '#f9e2af44',
    matchBorder: '#f9e2af',
    matchOverviewRuler: '#f9e2af',
    activeMatchBackground: '#f9e2afaa',
    activeMatchBorder: '#f9e2af',
    activeMatchColorOverviewRuler: '#fab387',
  },
};

function doSearch(dir) {
  const q = searchInput.value; if (!q) return;
  const n = panes.get(focusedPaneId); if (!n?.searchAddon) return;
  if (dir === 'next') n.searchAddon.findNext(q, SEARCH_OPTS);
  else n.searchAddon.findPrevious(q, SEARCH_OPTS);
}

searchInput?.addEventListener('input', () => doSearch('next'));
searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(e.shiftKey ? 'prev' : 'next'); } if (e.key === 'Escape') toggleSearch(); });
$('searchPrev')?.addEventListener('click', () => doSearch('prev'));
$('searchNext')?.addEventListener('click', () => doSearch('next'));
$('searchClose')?.addEventListener('click', () => toggleSearch());

/* ===========================
   COMMAND PALETTE
   =========================== */
let paletteVisible = false;
let paletteIdx = 0;

// Command palette items — built lazily from FEATURE_ITEMS (defined later) + extras
let COMMANDS = null;
function getCommands() {
  if (!COMMANDS) {
    COMMANDS = FEATURE_ITEMS.filter(i => !i.sep).concat([
      { label: 'Close Tab', hint: 'Ctrl+W', action: () => { if (activeTabId) closeTab(activeTabId); } },
    ]);
  }
  return COMMANDS;
}

function toggleCommandPalette() {
  paletteVisible = !paletteVisible;
  commandPalette.classList.toggle('visible', paletteVisible);
  cmdBackdrop.classList.toggle('visible', paletteVisible);
  if (paletteVisible) { cmdInput.value = ''; cmdInput.placeholder = 'Type a command...'; COMMANDS = null; paletteIdx = 0; renderCmdList(''); cmdInput.focus(); }
  else { COMMANDS = null; cmdInput.placeholder = 'Type a command...'; const n = panes.get(focusedPaneId); if (n?.terminal) n.terminal.focus(); }
}

function renderCmdList(filter) {
  const f = filter.toLowerCase();
  const filtered = getCommands().filter(c => c.label.toLowerCase().includes(f));
  cmdList.innerHTML = '';
  paletteIdx = Math.min(paletteIdx, Math.max(0, filtered.length - 1));
  filtered.forEach((cmd, i) => {
    const el = document.createElement('div');
    el.className = `command-palette-item${i === paletteIdx ? ' selected' : ''}`;
    el.innerHTML = `<span>${escapeHtml(cmd.label)}</span>${cmd.hint ? `<span class="command-hint">${escapeHtml(cmd.hint)}</span>` : ''}`;
    el.addEventListener('click', () => { cmd.action(); toggleCommandPalette(); });
    el.addEventListener('mouseenter', () => { paletteIdx = i; cmdList.querySelectorAll('.command-palette-item').forEach((e, j) => e.classList.toggle('selected', j === i)); });
    cmdList.appendChild(el);
  });
  return filtered;
}

cmdInput.addEventListener('input', () => { paletteIdx = 0; renderCmdList(cmdInput.value); });
cmdInput.addEventListener('keydown', (e) => {
  const items = cmdList.querySelectorAll('.command-palette-item');
  if (e.key === 'ArrowDown') { e.preventDefault(); paletteIdx = Math.min(paletteIdx + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('selected', i === paletteIdx)); items[paletteIdx]?.scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); paletteIdx = Math.max(paletteIdx - 1, 0); items.forEach((el, i) => el.classList.toggle('selected', i === paletteIdx)); items[paletteIdx]?.scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'Enter') { e.preventDefault(); const fil = getCommands().filter(c => c.label.toLowerCase().includes(cmdInput.value.toLowerCase())); if (fil[paletteIdx]) { fil[paletteIdx].action(); toggleCommandPalette(); } }
  else if (e.key === 'Escape') toggleCommandPalette();
});
cmdBackdrop.addEventListener('click', () => { if (paletteVisible) toggleCommandPalette(); });

/* ===========================
   WELCOME (first launch)
   =========================== */
let welcomeShown = false;
let mascotInterval = null;

function initWelcome() {
  if (localStorage.getItem('multi-terminal-welcomed')) {
    welcomeOverlay.style.display = 'none';
    return;
  }
  welcomeShown = true;
  welcomeOverlay.classList.add('visible');

  const tips = document.querySelectorAll('.welcome-tip');
  const speech = $('welcomeSpeech');
  const messages = ['Welcome to Multi Terminal!', 'Create tabs with Ctrl+T', 'Split panes to multitask!', 'Try the command palette!'];
  let idx = 0;

  mascotInterval = setInterval(() => {
    idx = (idx + 1) % messages.length;
    speech.style.opacity = '0';
    setTimeout(() => { speech.textContent = messages[idx]; speech.style.opacity = '1'; }, 300);
    tips.forEach((t, i) => t.classList.toggle('active', i === idx));
  }, 3000);
}

function dismissWelcome() {
  if (!welcomeShown) return;
  welcomeShown = false;
  welcomeOverlay.classList.remove('visible');
  localStorage.setItem('multi-terminal-welcomed', 'true');
  if (mascotInterval) clearInterval(mascotInterval);
  setTimeout(() => { welcomeOverlay.style.display = 'none'; }, 400);
}

$('welcomeStartBtn')?.addEventListener('click', () => { dismissWelcome(); if (tabs.size === 0) createTab(); });

/* ===========================
   ZOOM
   =========================== */
function zoomIn()    { fontSize = Math.min(fontSize + 1, 28); applyFontSize(); }
function zoomOut()   { fontSize = Math.max(fontSize - 1, 8);  applyFontSize(); }
function zoomReset() { fontSize = 13; applyFontSize(); }

function applyFontSize() {
  for (const [, node] of panes) {
    if (node.terminal) { node.terminal.options.fontSize = fontSize; try { node.fitAddon.fit(); } catch {} }
  }
}

/* ===========================
   WINDOW EVENTS
   =========================== */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { const tab = tabs.get(activeTabId); if (tab) fitAll(tab.paneTree); }, 50);
});

window.termAPI.onWindowFocus((focused) => document.body.classList.toggle('window-blurred', !focused));

/* ===========================
   MENU ACTIONS (IPC)
   =========================== */
window.termAPI.onMenuAction((action) => {
  switch (action) {
    case 'new-tab':          createTab(); break;
    case 'reopen-tab':       reopenLastClosedTab(); break;
    case 'close-pane':       if (focusedPaneId) closePaneById(focusedPaneId); break;
    case 'split-horizontal': if (focusedPaneId) splitPane(focusedPaneId, 'horizontal'); break;
    case 'split-vertical':   if (focusedPaneId) splitPane(focusedPaneId, 'vertical'); break;
    case 'toggle-search':    toggleSearch(); break;
    case 'zoom-in':          zoomIn(); break;
    case 'zoom-out':         zoomOut(); break;
    case 'zoom-reset':       zoomReset(); break;
    case 'command-palette':  toggleCommandPalette(); break;
    case 'toggle-broadcast': toggleBroadcast(); break;
    case 'new-folder':       createFolder(); break;
    case 'save-session':     window.termAPI.saveSession(buildSessionData()); showToast('Session saved', 'success'); break;
    case 'clear-terminal':   if (activeTabId) clearTerminal(activeTabId); break;
    case 'toggle-theme':     toggleTheme(); break;
    case 'toggle-side-panel': toggleSidePanel(); break;
    case 'open-playground':  togglePlayground(); break;
    case 'open-settings':    openSettings(); break;
  }
});

/* ===========================
   TAB CYCLING & REOPEN
   =========================== */
function cycleTab(delta) {
  const ids = [...tabs.keys()];
  if (ids.length <= 1) return;
  const idx = ids.indexOf(activeTabId);
  const next = (idx + delta + ids.length) % ids.length;
  switchTab(ids[next]);
}

function reopenLastClosedTab() {
  if (tabClosureStack.length === 0) { showToast('No closed tabs to reopen', 'info'); return; }
  const info = tabClosureStack.pop();
  // Check if folder still exists
  const folderId = (info.folderId && folders.has(info.folderId)) ? info.folderId : null;
  createTab(folderId, { cwd: info.cwd, label: info.label, color: info.color });
  showToast('Reopened: ' + info.label, 'success');
}

/* ===========================
   TAB CONTEXT MENU ACTIONS
   =========================== */
function duplicateTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  const folderId = tab.folderId && folders.has(tab.folderId) ? tab.folderId : null;
  createTab(folderId, { cwd: tab.cwd, label: tab.label + ' (copy)', color: tab.color });
}

function closeOtherTabs(keepId) {
  const toClose = [...tabs.keys()].filter(id => id !== keepId && !tabs.get(id)?.pinned);
  for (const id of toClose) closeTab(id);
}

function closeTabsToRight(tabId) {
  const ids = [...tabs.keys()];
  const idx = ids.indexOf(tabId);
  if (idx === -1) return;
  for (let i = ids.length - 1; i > idx; i--) {
    if (!tabs.get(ids[i])?.pinned) closeTab(ids[i]);
  }
}

function clearTerminal(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  const node = focusedPaneId ? panes.get(focusedPaneId) : findFirstPane(tab.paneTree);
  if (node?.terminal) {
    node.terminal.clear();
  }
}

/* ===========================
   TERMINAL BELL
   =========================== */
function flashTabBell(paneId) {
  // Find which tab owns this pane and flash it
  for (const [tabId] of tabs) {
    const tab = tabs.get(tabId);
    if (tab && treeContainsPane(tab.paneTree, paneId)) {
      if (tabId === activeTabId) return; // don't flash active tab
      const el = tabBar.querySelector(`[data-tab-id="${tabId}"]`);
      if (el && !el.classList.contains('tab-bell')) {
        el.classList.add('tab-bell');
        setTimeout(() => el.classList.remove('tab-bell'), 1500);
      }
      return;
    }
  }
}

/* ===========================
   TAB HIDING
   =========================== */
function hideTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  tab.hidden = true;
  // If the hidden tab was active, switch to another
  if (activeTabId === tabId) {
    const visible = [...tabs.entries()].find(([id, t]) => id !== tabId && !t.hidden);
    if (visible) switchTab(visible[0]);
    else showHomePage();
  }
  renderTabs();
  scheduleSessionSave();
  showToast(`"${tab.label}" hidden from tab bar`, 'info');
}

function unhideTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  tab.hidden = false;
  renderTabs();
  switchTab(tabId);
  scheduleSessionSave();
}

function getHiddenTabs() {
  const hidden = [];
  for (const [tabId, tab] of tabs) {
    if (tab.hidden) hidden.push({ id: tabId, label: tab.label, color: tab.color });
  }
  return hidden;
}

function showHiddenTabsMenu() {
  const hidden = getHiddenTabs();
  if (hidden.length === 0) {
    showToast('No hidden tabs', 'info');
    return;
  }
  // Use command palette approach — open a palette-style picker
  toggleCommandPalette();
  // Override command list with hidden tabs
  cmdInput.value = '';
  cmdInput.placeholder = 'Select a hidden tab to show...';
  COMMANDS = hidden.map(h => ({
    label: `Show: ${h.label}`,
    hint: '',
    action: () => unhideTab(h.id),
  }));
  renderCmdList('');
}

/* ===========================
   TAB PINNING
   =========================== */
function togglePinTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  tab.pinned = !tab.pinned;
  if (tab.pinned) {
    // Move pinned tab to the front of tabOrder (among non-folder items)
    tabOrder = tabOrder.filter(i => !(i.type === 'tab' && i.id === tabId));
    // Insert after last pinned tab
    let insertIdx = 0;
    for (let i = 0; i < tabOrder.length; i++) {
      if (tabOrder[i].type === 'tab') {
        const t = tabs.get(tabOrder[i].id);
        if (t && t.pinned) { insertIdx = i + 1; continue; }
        break;
      }
    }
    tabOrder.splice(insertIdx, 0, { type: 'tab', id: tabId });
    // Remove from folder if in one
    if (tab.folderId) {
      const folder = folders.get(tab.folderId);
      if (folder) folder.tabIds = folder.tabIds.filter(id => id !== tabId);
      tab.folderId = null;
    }
  }
  renderTabs();
  scheduleSessionSave();
  showToast(tab.pinned ? 'Tab pinned' : 'Tab unpinned', 'info');
}

/* ===========================
   EXPORT TERMINAL OUTPUT
   =========================== */
async function exportTerminalOutput(tabId) {
  const content = getTerminalBuffer(tabId);
  if (!content) { showToast('No terminal output to export', 'warning'); return; }
  const tab = tabs.get(tabId);
  const name = tab ? tab.label.replace(/[^a-zA-Z0-9_-]/g, '_') : 'terminal';
  const result = await window.termAPI.showSaveDialog({
    title: 'Export Terminal Output',
    defaultPath: `${name}_output.txt`,
    filters: [{ name: 'Text Files', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }],
    content,
  });
  if (result && result.success) {
    showToast('Output exported to ' + result.filePath.split(/[/\\]/).pop(), 'success');
  } else if (result && result.error) {
    showToast('Export failed: ' + result.error, 'error');
  }
}

/* ===========================
   SETTINGS PANEL
   =========================== */
function saveSettings() {
  localStorage.setItem('multi-terminal-settings', JSON.stringify(settings));
}

function openSettings() {
  const panel = $('settingsPanel');
  const backdrop = $('settingsBackdrop');
  if (!panel) return;

  // Populate current values
  const fontSel = $('settingFontFamily');
  if (fontSel) { for (const opt of fontSel.options) { if (opt.value === settings.fontFamily) { opt.selected = true; break; } } }
  const cursorSel = $('settingCursorStyle');
  if (cursorSel) cursorSel.value = settings.cursorStyle;
  const cursorBlinkSel = $('settingCursorBlink');
  if (cursorBlinkSel) cursorBlinkSel.value = String(settings.cursorBlink);
  const scrollbackInp = $('settingScrollback');
  if (scrollbackInp) scrollbackInp.value = settings.scrollback;
  const autoRenameSel = $('settingAutoRename');
  if (autoRenameSel) autoRenameSel.value = String(settings.autoRename);

  panel.classList.add('visible');
  if (backdrop) backdrop.classList.add('visible');
}

function closeSettings() {
  const panel = $('settingsPanel');
  const backdrop = $('settingsBackdrop');
  if (panel) panel.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('visible');
}

function applySettingsFromPanel() {
  const fontSel = $('settingFontFamily');
  const cursorSel = $('settingCursorStyle');
  const cursorBlinkSel = $('settingCursorBlink');
  const scrollbackInp = $('settingScrollback');
  const autoRenameSel = $('settingAutoRename');

  if (fontSel) settings.fontFamily = fontSel.value;
  if (cursorSel) settings.cursorStyle = cursorSel.value;
  if (cursorBlinkSel) settings.cursorBlink = cursorBlinkSel.value === 'true';
  if (scrollbackInp) settings.scrollback = Math.max(100, Math.min(100000, parseInt(scrollbackInp.value) || 10000));
  if (autoRenameSel) settings.autoRename = autoRenameSel.value === 'true';

  saveSettings();

  // Apply to all terminals
  for (const [, node] of panes) {
    if (node.terminal) {
      node.terminal.options.fontFamily = settings.fontFamily;
      node.terminal.options.cursorStyle = settings.cursorStyle;
      node.terminal.options.cursorBlink = settings.cursorBlink;
      node.terminal.options.scrollback = settings.scrollback;
      try { node.fitAddon.fit(); } catch {}
    }
  }

  showToast('Settings saved', 'success');
}

// Wire up settings panel events
$('settingsClose')?.addEventListener('click', closeSettings);
$('settingsBackdrop')?.addEventListener('click', closeSettings);

// Apply settings on change (live preview)
['settingFontFamily', 'settingCursorStyle', 'settingCursorBlink', 'settingScrollback', 'settingAutoRename'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('change', applySettingsFromPanel);
});

/* ===========================
   KEYBOARD SHORTCUTS
   =========================== */
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey && e.key === 'P') { e.preventDefault(); toggleCommandPalette(); return; }
  if (mod && e.shiftKey && e.key === 'T') { e.preventDefault(); reopenLastClosedTab(); return; }
  if (mod && e.key === 'Tab') { e.preventDefault(); cycleTab(e.shiftKey ? -1 : 1); return; }
  if (mod && e.key === 'l') { e.preventDefault(); if (activeTabId) clearTerminal(activeTabId); return; }
  if (mod && e.key === ',') { e.preventDefault(); openSettings(); return; }
  if (mod && e.key >= '1' && e.key <= '9') { e.preventDefault(); const i = parseInt(e.key) - 1; const ids = [...tabs.keys()]; if (i < ids.length) switchTab(ids[i]); }
  if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); focusNextPane(1); }
  if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); focusNextPane(-1); }
});

/* ===========================
   SESSION PERSISTENCE
   =========================== */
function buildSessionData() {
  const sessionTabs = [];
  for (const [tabId, tab] of tabs) {
    sessionTabs.push({
      id: tabId,
      label: tab.label,
      color: tab.color,
      folderId: tab.folderId,
      cwd: tab.cwd || null,
      locked: tab.locked || false,
      pinned: tab.pinned || false,
      hidden: tab.hidden || false,
      shellName: tab.shellName || '',
    });
  }

  const sessionFolders = [];
  for (const [folderId, folder] of folders) {
    sessionFolders.push({
      id: folderId,
      label: folder.label,
      collapsed: folder.collapsed,
      tabIds: [...folder.tabIds],
    });
  }

  return {
    tabs: sessionTabs,
    folders: sessionFolders,
    tabOrder: tabOrder.map(item => ({ type: item.type, id: item.id })),
    activeTabId,
    fontSize,
  };
}

function extractPaneBuffer(node) {
  if (!node) return '';
  if (node.type === 'pane' && node.terminal) {
    const buf = node.terminal.buffer.active;
    const lines = [];
    // Include scrollback + visible viewport
    const totalRows = buf.length;
    for (let i = 0; i < totalRows; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true));
    }
    // Trim trailing empty lines but keep at least some content
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    return lines.join('\n');
  }
  if (node.type === 'split' && node.children) {
    return node.children.map(extractPaneBuffer).filter(Boolean).join('\n---split---\n');
  }
  return '';
}

function getTerminalBuffer(tabId) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.paneTree) return '';
  return extractPaneBuffer(tab.paneTree);
}

function saveAllBuffersSync() {
  const buffers = [];
  for (const [tabId] of tabs) {
    const content = getTerminalBuffer(tabId);
    buffers.push({ tabId, content });
  }
  window.termAPI.saveBuffersSync(buffers);
}

function scheduleSessionSave() {
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(() => {
    window.termAPI.saveSession(buildSessionData());
  }, 1000);
}

async function restoreSession() {
  const session = await window.termAPI.loadSession();
  if (!session || !session.tabs || session.tabs.length === 0) return false;

  // Restore folders first
  for (const sf of (session.folders || [])) {
    const id = sf.id;
    const num = parseInt(id.replace('folder-', ''));
    if (num > folderCounter) folderCounter = num;
    folders.set(id, { label: sf.label, collapsed: sf.collapsed || false, tabIds: [] });
  }

  // Restore tab order
  tabOrder = (session.tabOrder || []).map(item => ({ type: item.type, id: item.id }));

  // Restore tabs
  for (const st of session.tabs) {
    const id = st.id;
    const num = parseInt(id.replace('tab-', ''));
    if (num > tabCounter) tabCounter = num;
    const paneId = newPaneId();
    const pane = createPaneNode(paneId, st.cwd, id);

    tabs.set(id, {
      label: st.label,
      paneTree: pane,
      shellName: st.shellName || '',
      color: st.color || null,
      folderId: st.pinned ? null : (st.folderId || null),
      cwd: st.cwd || null,
      locked: st.locked || false,
      pinned: st.pinned || false,
      hidden: st.hidden || false,
      detectedProcess: 'idle',
    });

    // If restored tab had a non-default label, mark as manually renamed
    if (st.label && !/^Terminal \d+$/.test(st.label)) {
      manuallyRenamed.add(id);
    }

    // Add to folder's tabIds (but not pinned tabs)
    if (st.folderId && !st.pinned) {
      const folder = folders.get(st.folderId);
      if (folder) folder.tabIds.push(id);
    }
  }

  if (session.fontSize) fontSize = session.fontSize;

  renderTabs();

  // Switch to last active tab or the first one
  const targetTab = session.activeTabId && tabs.has(session.activeTabId)
    ? session.activeTabId
    : [...tabs.keys()][0];

  if (targetTab) {
    switchTab(targetTab);
    dismissWelcome();
  }

  return true;
}

// Save session on tab/folder changes and before unload
window.addEventListener('beforeunload', () => {
  window.termAPI.saveSessionSync(buildSessionData());
  saveAllBuffersSync();
});

/* ===========================
   DRAG & DROP (external paths)
   =========================== */
function setupDragDrop() {
  // Prevent Electron from navigating to dropped files (must be on document)
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      document.body.classList.add('drop-active');
    }
  });

  document.addEventListener('dragleave', (e) => {
    // Only remove drop indicator if leaving the window entirely
    if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
      document.body.classList.remove('drop-active');
    }
  });

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.body.classList.remove('drop-active');

    // Only handle external file drops
    if (!e.dataTransfer.types.includes('Files')) return;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const filePath = file.path;
      if (!filePath) continue;

      const result = await window.termAPI.resolvePath(filePath);
      if (result) {
        createTab(null, { cwd: result.dir, label: result.name });
      }
    }
  });
}

/* ===========================
   THEME SWITCHING
   =========================== */
function applyTheme(theme) {
  currentTheme = theme;
  THEME = THEMES[theme];
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('multi-terminal-theme', theme);

  // Update xterm theme for all open terminals
  for (const [, node] of panes) {
    if (node.terminal) {
      node.terminal.options.theme = THEME;
    }
  }

  // Update theme icon
  const icon = $('themeIcon');
  if (icon) {
    if (theme === 'light') {
      icon.innerHTML = '<path d="M8 14A6 6 0 0 1 8 2a5 5 0 0 0 0 12z" fill="currentColor"/>';
    } else {
      icon.innerHTML = '<circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>';
    }
  }

  // Notify main process to update titlebar overlay color
  window.termAPI.setTheme?.(theme);
}

function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

themeToggle?.addEventListener('click', toggleTheme);

/* ===========================
   SIDE PANEL — QUICK COMMANDS
   =========================== */
function toggleSidePanel() {
  sidePanel.classList.toggle('open');
  // Refit terminals when panel opens/closes
  setTimeout(() => {
    const tab = tabs.get(activeTabId);
    if (tab) fitAll(tab.paneTree);
  }, 250);
}

function saveQuickCommands() {
  localStorage.setItem('multi-terminal-quick-cmds', JSON.stringify(quickCommands));
}

function renderQuickCommands() {
  if (!quickCmdList) return;
  const empty = $('quickCmdEmpty');

  // Remove all quick-cmd elements (but keep the empty placeholder)
  quickCmdList.querySelectorAll('.quick-cmd').forEach(el => el.remove());

  if (quickCommands.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  for (const cmd of quickCommands) {
    const el = document.createElement('div');
    el.className = 'quick-cmd';
    el.innerHTML = `
      <div class="quick-cmd-body" title="Click to run: ${escapeHtml(cmd.command)}">
        <div class="quick-cmd-name">${escapeHtml(cmd.name)}</div>
        <div class="quick-cmd-preview">${escapeHtml(cmd.command)}</div>
      </div>
      <div class="quick-cmd-actions">
        <button class="quick-cmd-action edit" title="Edit">&#9998;</button>
        <button class="quick-cmd-action delete" title="Delete">&times;</button>
      </div>
    `;

    el.querySelector('.quick-cmd-body').addEventListener('click', () => runQuickCommand(cmd));
    el.querySelector('.edit').addEventListener('click', () => openQuickCmdDialog(cmd));
    el.querySelector('.delete').addEventListener('click', () => {
      quickCommands = quickCommands.filter(c => c.id !== cmd.id);
      saveQuickCommands();
      renderQuickCommands();
    });

    quickCmdList.appendChild(el);
  }
}

function runQuickCommand(cmd) {
  // If no active terminal, create one first
  if (!activeTabId || !focusedPaneId) {
    createTab();
    // Wait for the terminal to be ready then send
    setTimeout(() => sendCommandToFocusedPane(cmd.command), 500);
  } else {
    sendCommandToFocusedPane(cmd.command);
  }
}

function sendCommandToFocusedPane(command) {
  if (!focusedPaneId) return;
  window.termAPI.writePty(focusedPaneId, command + '\r');
}

function openQuickCmdDialog(cmd) {
  const nameInput = $('quickCmdName');
  const commandInput = $('quickCmdCommand');
  const title = $('quickCmdDialogTitle');

  if (cmd) {
    quickCmdEditId = cmd.id;
    nameInput.value = cmd.name;
    commandInput.value = cmd.command;
    title.textContent = 'Edit Quick Command';
  } else {
    quickCmdEditId = null;
    nameInput.value = '';
    commandInput.value = '';
    title.textContent = 'Add Quick Command';
  }

  quickCmdDialog.classList.add('visible');
  quickCmdBackdrop.classList.add('visible');
  nameInput.focus();
}

function closeQuickCmdDialog() {
  quickCmdDialog.classList.remove('visible');
  quickCmdBackdrop.classList.remove('visible');
}

function saveQuickCmdFromDialog() {
  const name = $('quickCmdName').value.trim();
  const command = $('quickCmdCommand').value.trim();
  if (!name || !command) return;

  if (quickCmdEditId) {
    const existing = quickCommands.find(c => c.id === quickCmdEditId);
    if (existing) {
      existing.name = name;
      existing.command = command;
    }
  } else {
    quickCommands.push({
      id: 'qcmd-' + Date.now(),
      name,
      command,
    });
  }

  saveQuickCommands();
  renderQuickCommands();
  closeQuickCmdDialog();
}

$('sidePanelClose')?.addEventListener('click', toggleSidePanel);
$('addQuickCmd')?.addEventListener('click', () => openQuickCmdDialog(null));
$('quickCmdCancel')?.addEventListener('click', closeQuickCmdDialog);
$('quickCmdSave')?.addEventListener('click', saveQuickCmdFromDialog);
quickCmdBackdrop?.addEventListener('click', closeQuickCmdDialog);

// Allow Enter in the name field to jump to command field
$('quickCmdName')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('quickCmdCommand').focus(); }
  if (e.key === 'Escape') closeQuickCmdDialog();
});
$('quickCmdCommand')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveQuickCmdFromDialog(); }
  if (e.key === 'Escape') closeQuickCmdDialog();
});

/* ===========================
   PLAYGROUND — CHARACTER DEFINITIONS
   =========================== */
/* Process type names (used in info panel) */
const PROCESS_NAMES = {
  claude: 'Claude AI', node: 'Node.js', git: 'Git', python: 'Python',
  docker: 'Docker', powershell: 'PowerShell', ssh: 'SSH', vim: 'Vim',
  build: 'Build', test: 'Test', database: 'Database', idle: 'Idle', unknown: 'Terminal',
};

/* ===========================
   PLAYGROUND — 3D SCENE
   =========================== */
let playground3D = null;

function _initPlayground3D(retries = 0) {
  const container = $('pgCanvasWrap');
  if (!container || playground3D) return;
  if (!window.Playground3D) {
    if (retries >= 50) { // Give up after 5 seconds
      console.error('Playground3D module failed to load');
      return;
    }
    setTimeout(() => _initPlayground3D(retries + 1), 100);
    return;
  }
  playground3D = new window.Playground3D(container);
  playground3D.onClick((tabId) => openPlaygroundInfo(tabId));
}

function renderPlayground() {
  const pgEmpty = $('pgEmptyOverlay');

  if (tabs.size === 0) {
    if (pgEmpty) pgEmpty.classList.remove('hidden');
    if (playground3D) playground3D.syncAgents(new Map());
    return;
  }

  if (pgEmpty) pgEmpty.classList.add('hidden');

  // Ensure the 3D scene is initialised
  if (!playground3D) _initPlayground3D();

  // Sync agents to 3D scene
  if (playground3D) {
    playground3D.syncAgents(tabs);
  }
}

function openPlaygroundInfo(tabId) {
  const tab = tabs.get(tabId);
  const panel = $('pgInfoPanel');
  if (!tab || !panel) return;

  playgroundDetailTabId = tabId;
  panel.classList.add('open');

  const proc = tab.detectedProcess || 'idle';
  const name = PROCESS_NAMES[proc] || PROCESS_NAMES.unknown;

  const title = $('pgInfoTitle');
  const body = $('pgInfoBody');
  const actions = $('pgInfoActions');
  if (!title || !body || !actions) return;

  title.textContent = tab.label;
  body.innerHTML = `
    <div class="pg-info-row"><span class="pg-info-label">Process</span><span class="pg-info-value">${escapeHtml(name)}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Shell</span><span class="pg-info-value">${escapeHtml(tab.shellName || 'unknown')}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Directory</span><span class="pg-info-value" title="${escapeHtml(tab.cwd || '~')}">${escapeHtml(tab.cwd || '~')}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Status</span><span class="pg-info-value">${tab.locked ? 'Locked' : (proc !== 'idle' ? 'Working' : 'Idle')}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Color</span><span class="pg-info-value">${tab.color || 'none'}</span></div>
  `;

  actions.innerHTML = '';
  const switchBtn = document.createElement('button');
  switchBtn.className = 'pg-info-btn primary';
  switchBtn.textContent = 'Switch to Terminal';
  switchBtn.addEventListener('click', () => switchTab(tabId));
  actions.appendChild(switchBtn);

  const lockBtn = document.createElement('button');
  lockBtn.className = 'pg-info-btn';
  lockBtn.textContent = tab.locked ? 'Unlock' : 'Lock';
  lockBtn.addEventListener('click', () => { tab.locked = !tab.locked; renderTabs(); scheduleSessionSave(); renderPlayground(); openPlaygroundInfo(tabId); });
  actions.appendChild(lockBtn);

  if (!tab.locked) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pg-info-btn danger';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => { closeTab(tabId); panel.classList.remove('open'); renderPlayground(); });
    actions.appendChild(closeBtn);
  }

  // Highlight in 3D scene
  if (playground3D) playground3D.highlightAgent(tabId);
}

$('pgInfoClose')?.addEventListener('click', () => {
  const panel = $('pgInfoPanel');
  if (panel) panel.classList.remove('open');
  if (playground3D) playground3D.clearHighlight();
});

// Playground button in tab bar handles navigation; no back button needed

/* ===========================
   BUTTON HANDLERS
   =========================== */
$('homeBtn')?.addEventListener('click', () => showHomePage());
playgroundBtn?.addEventListener('click', () => togglePlayground());

// Keyboard support for tab bar buttons
[$('homeBtn'), featureBtn, playgroundBtn].forEach(btn => {
  if (btn) btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } });
});

/* ===========================
   FEATURE DROPDOWN MENU
   =========================== */
const FEATURE_ITEMS = [
  { label: 'New Tab',               hint: 'Ctrl+T',       action: () => createTab() },
  { label: 'New Folder',            hint: '',              action: () => createFolder() },
  { label: 'Reopen Closed Tab',     hint: 'Ctrl+Shift+T', action: () => reopenLastClosedTab() },
  { sep: true },
  { label: 'Split Right',           hint: 'Ctrl+Shift+D', action: () => { if (focusedPaneId) splitPane(focusedPaneId, 'horizontal'); } },
  { label: 'Split Down',            hint: 'Ctrl+Shift+E', action: () => { if (focusedPaneId) splitPane(focusedPaneId, 'vertical'); } },
  { label: 'Close Pane',            hint: '',              action: () => { if (focusedPaneId) closePaneById(focusedPaneId); } },
  { sep: true },
  { label: 'Find in Terminal',      hint: 'Ctrl+Shift+F', action: () => toggleSearch() },
  { label: 'Clear Terminal',        hint: 'Ctrl+L',       action: () => { if (activeTabId) clearTerminal(activeTabId); } },
  { label: 'Toggle Broadcast Mode', hint: '',              action: () => toggleBroadcast() },
  { sep: true },
  { label: 'Duplicate Tab',         hint: '',              action: () => { if (activeTabId) duplicateTab(activeTabId); } },
  { label: 'Close Other Tabs',      hint: '',              action: () => { if (activeTabId) closeOtherTabs(activeTabId); } },
  { sep: true },
  { label: 'Toggle Playground',      hint: '',              action: () => togglePlayground() },
  { label: 'Quick Commands',        hint: '',              action: () => toggleSidePanel() },
  { label: 'Show Home',             hint: '',              action: () => showHomePage() },
  { sep: true },
  { label: 'Hide Current Tab',       hint: '',              action: () => { if (activeTabId) hideTab(activeTabId); } },
  { label: 'Show Hidden Tabs',       hint: '',              action: () => showHiddenTabsMenu() },
  { label: 'Pin/Unpin Current Tab',  hint: '',              action: () => { if (activeTabId) togglePinTab(activeTabId); } },
  { label: 'Lock Current Tab',      hint: '',              action: () => { const t = tabs.get(activeTabId); if (t) { t.locked = !t.locked; renderTabs(); scheduleSessionSave(); announce(t.locked ? 'Terminal locked' : 'Terminal unlocked'); } } },
  { label: 'Export Output to File', hint: '',              action: () => { if (activeTabId) exportTerminalOutput(activeTabId); } },
  { sep: true },
  { label: 'Settings',              hint: 'Ctrl+,',       action: () => openSettings() },
  { label: 'Toggle Theme',          hint: '',              action: () => toggleTheme() },
  { sep: true },
  { label: 'Zoom In',               hint: 'Ctrl+=',       action: () => zoomIn() },
  { label: 'Zoom Out',              hint: 'Ctrl+-',       action: () => zoomOut() },
  { label: 'Reset Zoom',            hint: 'Ctrl+0',       action: () => zoomReset() },
  { sep: true },
  { label: 'Next Tab',              hint: 'Ctrl+Tab',     action: () => cycleTab(1) },
  { label: 'Previous Tab',          hint: 'Ctrl+Shift+Tab', action: () => cycleTab(-1) },
  { label: 'Next Pane',             hint: 'Alt+Right',    action: () => focusNextPane(1) },
  { label: 'Previous Pane',         hint: 'Alt+Left',     action: () => focusNextPane(-1) },
  { sep: true },
  { label: 'Save Session',          hint: '',              action: () => { window.termAPI.saveSession(buildSessionData()); showToast('Session saved', 'success'); } },
];

let featureMenuOpen = false;

function renderFeatureMenu() {
  if (!featureMenu) return;
  featureMenu.innerHTML = '';
  for (const item of FEATURE_ITEMS) {
    if (item.sep) {
      const sep = document.createElement('div');
      sep.className = 'feature-menu-sep';
      sep.setAttribute('role', 'separator');
      featureMenu.appendChild(sep);
      continue;
    }
    const el = document.createElement('div');
    el.className = 'feature-menu-item';
    el.setAttribute('role', 'menuitem');
    el.innerHTML = `<span>${escapeHtml(item.label)}</span>${item.hint ? `<span class="hint">${escapeHtml(item.hint)}</span>` : ''}`;
    el.addEventListener('click', (e) => { e.stopPropagation(); closeFeatureMenu(); item.action(); });
    featureMenu.appendChild(el);
  }
}

function openFeatureMenu() {
  featureMenuOpen = true;
  // Position menu below the button
  const rect = featureBtn.getBoundingClientRect();
  featureMenu.style.left = `${rect.left}px`;
  featureMenu.style.top = `${rect.bottom}px`;
  featureMenu.classList.add('visible');
  featureBtn.classList.add('open');
  featureBtn.setAttribute('aria-expanded', 'true');
}

function closeFeatureMenu() {
  featureMenuOpen = false;
  featureMenu.classList.remove('visible');
  featureBtn.classList.remove('open');
  featureBtn.setAttribute('aria-expanded', 'false');
}

function toggleFeatureMenu() {
  if (featureMenuOpen) closeFeatureMenu();
  else { renderFeatureMenu(); openFeatureMenu(); }
}

featureBtn?.addEventListener('click', (e) => { e.stopPropagation(); toggleFeatureMenu(); });
document.addEventListener('click', () => { if (featureMenuOpen) closeFeatureMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (featureMenuOpen) closeFeatureMenu(); closeSettings(); } });

/* ===========================
   BOOT
   =========================== */
updateStatus('Starting...');
applyTheme(currentTheme);
renderQuickCommands();
initWelcome();
setupDragDrop();

// Detect platform and add body class for Windows-specific CSS
window.termAPI.getPlatform().then((platform) => {
  if (platform === 'win32') document.body.classList.add('platform-win');
});

// Try to restore previous session; if none, show homepage
(async () => {
  const restored = await restoreSession();
  if (!restored && !welcomeShown) {
    showHomePage();
  }
})();
