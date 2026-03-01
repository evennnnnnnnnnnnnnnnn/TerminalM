/* ============================================
   TerminalM — Tabs
   ============================================ */
import {
  tabs, folders, panes, tabDomCache, tabClosureStack,
  getTabOrder, setTabOrder,
  getActiveTabId, setActiveTabId,
  getFocusedPaneId, setFocusedPaneId,
  getTabCounter,
  nextTabId, nextPaneId,
  manuallyRenamed,
  getSettings,
} from './state.js';
import { $, escapeHtml, announce, showToast, countPanes } from './utils.js';
import {
  createPaneNode, destroyTree, initPane, setFocusedPane,
  renderTerminalArea, invalidateTabDomCache, findFirstPane,
  fitAllGuarded, getAllPaneIds, treeContainsPane,
} from './panes.js';
import { updateStatusBar } from './panes.js';
import { scheduleSessionSave, getTerminalBuffer } from './session.js';
import { dismissWelcome } from './welcome.js';
import { moveTabToFolder, toggleFolderCollapse } from './folders.js';

/* ---- Lazy-bound imports (set from other modules to break cycles) ---- */
let _showHomePage = null;
let _hideHomePage = null;
let _updateHomeContent = null;
let _showTabContextMenu = null;
let _showFolderContextMenu = null;

export function setHomeCallbacks(show, hide, update) {
  _showHomePage = show;
  _hideHomePage = hide;
  _updateHomeContent = update;
}
export function setContextMenuCallbacks(tabCtx, folderCtx) {
  _showTabContextMenu = tabCtx;
  _showFolderContextMenu = folderCtx;
}

/* ===========================
   TAB ORDER
   =========================== */
export function addTabToOrder(tabId) {
  getTabOrder().push({ type: 'tab', id: tabId });
}

export function removeFromOrder(id) {
  setTabOrder(getTabOrder().filter(item => item.id !== id));
}

export function getAllTabOrder() {
  const pinned = [];
  const rest = [];
  for (const item of getTabOrder()) {
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

export function getVisibleTabOrder() {
  const pinned = [];
  const rest = [];
  for (const item of getTabOrder()) {
    if (item.type === 'folder') {
      const folder = folders.get(item.id);
      if (!folder) continue;
      const visibleTabIds = folder.tabIds.filter(tid => {
        const t = tabs.get(tid);
        return t && !t.hidden;
      });
      if (visibleTabIds.length === 0 && folder.tabIds.length > 0) continue;
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
   CREATE / CLOSE / SWITCH
   =========================== */
export function createTab(inFolderId, options) {
  if (inFolderId && typeof inFolderId !== 'string') inFolderId = undefined;
  const opts = options || {};
  // Inherit folder rootPath if no explicit cwd
  if (!opts.cwd && inFolderId) {
    const folder = folders.get(inFolderId);
    if (folder && folder.rootPath) opts.cwd = folder.rootPath;
  }
  const tabId = nextTabId();
  const paneId = nextPaneId();
  const pane = createPaneNode(paneId, opts.cwd);
  const label = opts.label || `Terminal ${getTabCounter()}`;

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

export function closeTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  if (tab.locked) {
    announce('Terminal is locked and cannot be closed');
    showToast('Terminal is locked', 'warning');
    return;
  }
  if (tab.pinned) {
    announce('Pinned tab cannot be closed');
    showToast('Unpin the tab first', 'warning');
    return;
  }

  tabClosureStack.push({
    label: tab.label,
    color: tab.color,
    folderId: tab.folderId,
    cwd: tab.cwd,
    shellName: tab.shellName,
  });
  if (tabClosureStack.length > 10) tabClosureStack.shift();

  try { destroyTree(tab.paneTree); } catch {}
  invalidateTabDomCache(tabId);

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

  const homePage = $('homePage');
  const isHome = homePage && homePage.style.display !== 'none';
  const activeTabId = getActiveTabId();

  if (activeTabId === tabId) {
    const remaining = [...tabs.keys()];
    if (remaining.length > 0) {
      switchTab(remaining[remaining.length - 1]);
    } else {
      setActiveTabId(null);
      for (const [, c] of tabDomCache) c.style.display = 'none';
      if (_showHomePage) _showHomePage();
      renderTabs();
      scheduleSessionSave();
      return;
    }
  }
  renderTabs();
  if (isHome && _updateHomeContent) _updateHomeContent();
  scheduleSessionSave();
}

export function switchTab(tabId) {
  if (getActiveTabId() === tabId) return;
  setActiveTabId(tabId);
  setFocusedPaneId(null);
  if (_hideHomePage) _hideHomePage();
  renderTabs();
  renderTerminalArea();
  updateStatusBar();
  const tabBar = $('tabBar');
  const tabEl = tabBar?.querySelector(`[data-tab-id="${tabId}"]`);
  if (tabEl) tabEl.classList.remove('tab-activity');
  scheduleSessionSave();
}

/* ===========================
   TAB RENDERING
   =========================== */
export function renderTabs() {
  const tabBar = $('tabBar');
  if (!tabBar) return;
  tabBar.querySelectorAll('.tab, .folder-group').forEach(el => el.remove());

  const order = getVisibleTabOrder();
  let currentFolderEl = null;
  const activeTabId = getActiveTabId();

  for (const item of order) {
    if (item.type === 'folder') {
      const folder = folders.get(item.id);
      if (!folder) continue;

      const groupEl = document.createElement('div');
      groupEl.className = 'folder-group';
      groupEl.dataset.folderId = item.id;

      const hdr = document.createElement('div');
      hdr.className = `folder-header${folder.collapsed ? ' collapsed' : ''}`;
      const fColor = folder.color || 'yellow';
      hdr.style.background = `color-mix(in srgb, var(--${fColor}) 6%, transparent)`;
      hdr.style.borderRightColor = `color-mix(in srgb, var(--${fColor}) 15%, transparent)`;
      hdr.innerHTML = `
        <svg class="folder-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" style="color: var(--${fColor})">
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5C14.33 3.5 15 4.17 15 5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V3.5Z"
            stroke="currentColor" stroke-width="1.2" fill="${folder.collapsed ? 'currentColor' : 'none'}" opacity="${folder.collapsed ? '0.3' : '1'}"/>
        </svg>
        <span class="folder-label">${escapeHtml(folder.label)}</span>
        <span class="folder-count">${folder.tabIds.length}</span>
      `;
      hdr.title = `${folder.label} (${folder.tabIds.length} tabs) \u2014 click to ${folder.collapsed ? 'expand' : 'collapse'}`;
      hdr.addEventListener('click', () => toggleFolderCollapse(item.id));
      hdr.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (_showFolderContextMenu) _showFolderContextMenu(e.clientX, e.clientY, item.id);
      });
      hdr.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startRenameFolder(hdr, item.id);
      });
      hdr.draggable = true;
      hdr.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        groupEl.classList.add('dragging');
        e.dataTransfer.setData('text/plain', 'folder:' + item.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      hdr.addEventListener('dragend', () => {
        groupEl.classList.remove('dragging');
        tabBar.querySelectorAll('.folder-header').forEach(h => h.classList.remove('drag-over'));
      });
      hdr.addEventListener('dragover', (e) => {
        if (e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        hdr.classList.add('drag-over');
      });
      hdr.addEventListener('dragleave', () => hdr.classList.remove('drag-over'));
      hdr.addEventListener('drop', (e) => {
        if (e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        hdr.classList.remove('drag-over');
        const fromId = e.dataTransfer.getData('text/plain');
        if (fromId && fromId.startsWith('folder:')) {
          const srcFolderId = fromId.slice(7);
          if (srcFolderId !== item.id) reorderFolders(srcFolderId, item.id);
        } else if (fromId && tabs.has(fromId)) {
          moveTabToFolder(fromId, item.id);
        }
      });
      groupEl.appendChild(hdr);

      const content = document.createElement('div');
      content.className = 'folder-content';
      content.style.setProperty('--folder-color', `var(--${fColor})`);
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

  const tc = $('statusTabCount');
  if (tc) {
    const total = tabs.size;
    let hiddenCount = 0;
    for (const [, t] of tabs) { if (t.hidden) hiddenCount++; }
    tc.textContent = hiddenCount > 0
      ? `${total} tab${total !== 1 ? 's' : ''} (${hiddenCount} hidden)`
      : `${total} tab${total !== 1 ? 's' : ''}`;
  }
}

function buildTabEl(tabId, tab, inFolder) {
  const activeTabId = getActiveTabId();
  const el = document.createElement('div');
  el.className = `tab${tabId === activeTabId ? ' active' : ''}${inFolder ? ' in-folder' : ''}${tab.pinned ? ' pinned' : ''}`;
  el.draggable = !tab.pinned;
  el.dataset.tabId = tabId;

  const colorBar = tab.color
    ? `<span class="tab-color-bar" style="background: var(--${tab.color})"></span>`
    : '';
  const pinIco = tab.pinned
    ? '<span class="tab-pin" title="Pinned" style="font-size:10px;opacity:0.7">&#128204;</span>'
    : '';
  const lockIco = tab.locked ? '<span class="tab-lock" title="Locked">&#128274;</span>' : '';
  const closeBtn = (tab.locked || tab.pinned) ? '' : '<span class="tab-close">&times;</span>';
  el.innerHTML = `${colorBar}<span class="tab-icon">&gt;_</span><span class="tab-label">${escapeHtml(tab.label)}</span>${pinIco}${lockIco}${closeBtn}`;
  el.setAttribute('role', 'tab');
  el.setAttribute('aria-selected', tabId === activeTabId ? 'true' : 'false');
  el.setAttribute('aria-label', `${tab.label}${tab.locked ? ' (locked)' : ''}`);

  el.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close')) switchTab(tabId);
  });
  const closeEl = el.querySelector('.tab-close');
  if (closeEl) {
    closeEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeTab(tabId);
    });
  }
  el.addEventListener('dblclick', (e) => {
    e.preventDefault();
    startRenameTab(el, tabId);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (_showTabContextMenu) _showTabContextMenu(e.clientX, e.clientY, tabId);
  });

  el.addEventListener('dragstart', (e) => {
    el.classList.add('dragging');
    e.dataTransfer.setData('text/plain', tabId);
    e.dataTransfer.effectAllowed = 'move';
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    const tabBar = $('tabBar');
    if (tabBar) tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('drag-over'));
  });
  el.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
  el.addEventListener('drop', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    el.classList.remove('drag-over');
    const fid = e.dataTransfer.getData('text/plain');
    if (fid && fid !== tabId) reorderTabs(fid, tabId);
  });
  return el;
}

export function startRenameTab(el, tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  manuallyRenamed.add(tabId);
  const lbl = el.querySelector('.tab-label');
  const inp = document.createElement('input');
  inp.className = 'tab-label-input';
  inp.value = tab.label;
  inp.maxLength = 30;
  lbl.replaceWith(inp);
  inp.focus();
  inp.select();
  const done = () => {
    tab.label = inp.value.trim() || tab.label;
    renderTabs();
    scheduleSessionSave();
  };
  inp.addEventListener('blur', done);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') { inp.value = tab.label; inp.blur(); }
  });
}

export function startRenameFolder(hdr, folderId) {
  const folder = folders.get(folderId);
  if (!folder) return;
  const lbl = hdr.querySelector('.folder-label') || hdr.querySelector('.home-folder-label');
  if (lbl) {
    const inp = document.createElement('input');
    inp.className = 'tab-label-input';
    inp.value = folder.label;
    inp.maxLength = 30;
    lbl.replaceWith(inp);
    inp.focus();
    inp.select();
    const done = () => {
      folder.label = inp.value.trim() || folder.label;
      renderTabs();
      scheduleSessionSave();
    };
    inp.addEventListener('blur', done);
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') inp.blur();
      if (e.key === 'Escape') { inp.value = folder.label; inp.blur(); }
    });
  } else {
    const newName = prompt('Rename folder:', folder.label);
    if (newName && newName.trim()) {
      folder.label = newName.trim();
      renderTabs();
      scheduleSessionSave();
    }
  }
}

export function reorderTabs(fromId, toId) {
  const fromTab = tabs.get(fromId);
  const toTab = tabs.get(toId);
  if (!fromTab || !toTab) return;

  if (fromTab.folderId && fromTab.folderId === toTab.folderId) {
    const folder = folders.get(fromTab.folderId);
    if (folder) {
      const a = folder.tabIds.indexOf(fromId);
      const b = folder.tabIds.indexOf(toId);
      if (a !== -1 && b !== -1) {
        folder.tabIds.splice(a, 1);
        folder.tabIds.splice(b, 0, fromId);
      }
    }
    renderTabs();
    scheduleSessionSave();
    return;
  }

  const tabOrder = getTabOrder();
  const fi = tabOrder.findIndex(i => i.type === 'tab' && i.id === fromId);
  const ti = tabOrder.findIndex(i => i.type === 'tab' && i.id === toId);
  if (fi !== -1 && ti !== -1) {
    const [m] = tabOrder.splice(fi, 1);
    tabOrder.splice(ti, 0, m);
  }
  renderTabs();
  scheduleSessionSave();
}

export function reorderFolders(fromId, toId) {
  const tabOrder = getTabOrder();
  const fi = tabOrder.findIndex(i => i.type === 'folder' && i.id === fromId);
  const ti = tabOrder.findIndex(i => i.type === 'folder' && i.id === toId);
  if (fi !== -1 && ti !== -1) {
    const [m] = tabOrder.splice(fi, 1);
    tabOrder.splice(ti, 0, m);
  }
  renderTabs();
  if (_updateHomeContent) _updateHomeContent();
  scheduleSessionSave();
}

/* ===========================
   TAB CYCLING & REOPEN
   =========================== */
export function cycleTab(delta) {
  const ids = [...tabs.keys()];
  if (ids.length <= 1) return;
  const idx = ids.indexOf(getActiveTabId());
  const next = (idx + delta + ids.length) % ids.length;
  switchTab(ids[next]);
}

export function reopenLastClosedTab() {
  if (tabClosureStack.length === 0) {
    showToast('No closed tabs to reopen', 'info');
    return;
  }
  const info = tabClosureStack.pop();
  const folderId = (info.folderId && folders.has(info.folderId)) ? info.folderId : null;
  createTab(folderId, { cwd: info.cwd, label: info.label, color: info.color });
  showToast('Reopened: ' + info.label, 'success');
}

/* ===========================
   TAB CONTEXT ACTIONS
   =========================== */
export function duplicateTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  const folderId = tab.folderId && folders.has(tab.folderId) ? tab.folderId : null;
  createTab(folderId, { cwd: tab.cwd, label: tab.label + ' (copy)', color: tab.color });
}

export function closeOtherTabs(keepId) {
  const toClose = [...tabs.keys()].filter(id => id !== keepId && !tabs.get(id)?.pinned);
  for (const id of toClose) closeTab(id);
}

export function closeTabsToRight(tabId) {
  const ids = [...tabs.keys()];
  const idx = ids.indexOf(tabId);
  if (idx === -1) return;
  for (let i = ids.length - 1; i > idx; i--) {
    if (!tabs.get(ids[i])?.pinned) closeTab(ids[i]);
  }
}

export function clearTerminal(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  const fpId = getFocusedPaneId();
  const node = fpId ? panes.get(fpId) : findFirstPane(tab.paneTree);
  if (node?.terminal) node.terminal.clear();
}

export function flashTabBell(paneId) {
  const tabBar = $('tabBar');
  const activeTabId = getActiveTabId();
  for (const [tabId] of tabs) {
    const tab = tabs.get(tabId);
    if (tab && treeContainsPane(tab.paneTree, paneId)) {
      if (tabId === activeTabId) return;
      const el = tabBar?.querySelector(`[data-tab-id="${tabId}"]`);
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
export function hideTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  tab.hidden = true;
  if (getActiveTabId() === tabId) {
    const visible = [...tabs.entries()].find(([id, t]) => id !== tabId && !t.hidden);
    if (visible) switchTab(visible[0]);
    else if (_showHomePage) _showHomePage();
  }
  renderTabs();
  scheduleSessionSave();
  showToast(`"${tab.label}" hidden from tab bar`, 'info');
}

export function unhideTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  tab.hidden = false;
  renderTabs();
  switchTab(tabId);
  scheduleSessionSave();
}

export function getHiddenTabs() {
  const hidden = [];
  for (const [tabId, tab] of tabs) {
    if (tab.hidden) hidden.push({ id: tabId, label: tab.label, color: tab.color });
  }
  return hidden;
}

export function showHiddenTabsMenu() {
  // Lazy import to avoid circular
  import('./command-palette.js').then(({ toggleCommandPalette, renderCmdList }) => {
    const hidden = getHiddenTabs();
    if (hidden.length === 0) {
      showToast('No hidden tabs', 'info');
      return;
    }
    toggleCommandPalette();
    const cmdInput = $('commandPaletteInput');
    if (cmdInput) {
      cmdInput.value = '';
      cmdInput.placeholder = 'Select a hidden tab to show...';
    }
    import('./state.js').then(({ setCommands }) => {
      setCommands(hidden.map(h => ({
        label: `Show: ${h.label}`,
        hint: '',
        action: () => unhideTab(h.id),
      })));
      renderCmdList('');
    });
  });
}

/* ===========================
   TAB PINNING
   =========================== */
export function togglePinTab(tabId) {
  const tab = tabs.get(tabId);
  if (!tab) return;
  tab.pinned = !tab.pinned;
  if (tab.pinned) {
    const tabOrder = getTabOrder();
    const filtered = tabOrder.filter(i => !(i.type === 'tab' && i.id === tabId));
    let insertIdx = 0;
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].type === 'tab') {
        const t = tabs.get(filtered[i].id);
        if (t && t.pinned) { insertIdx = i + 1; continue; }
        break;
      }
    }
    filtered.splice(insertIdx, 0, { type: 'tab', id: tabId });
    setTabOrder(filtered);
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
export async function exportTerminalOutput(tabId) {
  const content = getTerminalBuffer(tabId);
  if (!content) {
    showToast('No terminal output to export', 'warning');
    return;
  }
  const tab = tabs.get(tabId);
  const name = tab ? tab.label.replace(/[^a-zA-Z0-9_-]/g, '_') : 'terminal';
  const result = await window.termAPI.showSaveDialog({
    title: 'Export Terminal Output',
    defaultPath: `${name}_output.txt`,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    content,
  });
  if (result && result.success) {
    showToast('Output exported to ' + result.filePath.split(/[/\\]/).pop(), 'success');
  } else if (result && result.error) {
    showToast('Export failed: ' + result.error, 'error');
  }
}
