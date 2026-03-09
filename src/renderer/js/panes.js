/* ============================================
   TerminalM — Pane Tree
   ============================================ */
import {
  Terminal, FitAddon, WebLinksAddon, SearchAddon, WebglAddon,
  tabs, panes, lastPaneSize, tabDomCache,
  getActiveTabId, getFocusedPaneId, setFocusedPaneId,
  getFontSize, getBroadcastMode,
  getSettings,
  manuallyRenamed,
  PROCESS_PATTERNS,
  getPtyResizeTimer, setPtyResizeTimer,
} from './state.js';
import { $, updateStatus, escapeHtml } from './utils.js';
import { getTheme } from './theme.js';
import { closeTab, renderTabs, flashTabBell } from './tabs.js';
import { scheduleSessionSave } from './session.js';

/* ---- Context menu helper (bound later to avoid circular) ---- */
let _showContextMenu = null;
export function setShowContextMenu(fn) { _showContextMenu = fn; }

/* ---- Pane Node Factory ---- */
export function createPaneNode(id, cwd, restoreTabId) {
  const node = {
    type: 'pane',
    id,
    terminal: null,
    fitAddon: null,
    searchAddon: null,
    cleanup: null,
    cwd: cwd || null,
    restoreTabId: restoreTabId || null,
  };
  panes.set(id, node);
  return node;
}

export function destroyTree(node) {
  if (node.type === 'pane') {
    if (node.cleanup) node.cleanup();
    if (node.terminal) node.terminal.dispose();
    window.termAPI.killPty(node.id);
    panes.delete(node.id);
    lastPaneSize.delete(node.id);
  } else {
    node.children.forEach(destroyTree);
  }
}

/* ---- Init Pane (terminal setup) ---- */
export function initPane(node, container) {
  const settings = getSettings();
  const term = new Terminal({
    fontFamily: settings.fontFamily,
    fontSize: getFontSize(),
    lineHeight: 1.25,
    cursorBlink: settings.cursorBlink,
    cursorStyle: settings.cursorStyle,
    cursorWidth: 2,
    scrollback: settings.scrollback,
    theme: getTheme(),
    allowProposedApi: true,
    macOptionIsMeta: true,
    drawBoldTextInBrightColors: true,
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon());

  let searchAddon = null;
  if (SearchAddon) {
    searchAddon = new SearchAddon();
    term.loadAddon(searchAddon);
  }
  if (WebglAddon) {
    try {
      const w = new WebglAddon();
      w.onContextLoss(() => w.dispose());
      term.loadAddon(w);
    } catch {}
  }

  term.open(container);
  requestAnimationFrame(() => { try { fitAddon.fit(); } catch {} });

  // Custom key handler for clipboard and multiline support
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown') return true;
    const ctrl = e.ctrlKey && !e.altKey && !e.metaKey;

    if (ctrl && e.shiftKey && e.key === 'C') {
      const sel = term.getSelection();
      if (sel) navigator.clipboard.writeText(sel);
      return false;
    }
    if (ctrl && e.shiftKey && e.key === 'V') {
      navigator.clipboard.readText().then(text => {
        if (text) window.termAPI.writePty(node.id, text);
      });
      return false;
    }
    if (ctrl && !e.shiftKey && e.key === 'c') {
      const sel = term.getSelection();
      if (sel) {
        navigator.clipboard.writeText(sel);
        term.clearSelection();
        return false;
      }
      return true;
    }
    if (ctrl && !e.shiftKey && e.key === 'v') {
      return false; // Block \x16; browser paste event → xterm onData → writePty
    }
    if (ctrl && !e.shiftKey && e.key === 'Enter') {
      window.termAPI.writePty(node.id, '\n');
      return false;
    }
    return true;
  });

  node.terminal = term;
  node.fitAddon = fitAddon;
  node.searchAddon = searchAddon;

  term.textarea?.addEventListener('focus', () => setFocusedPane(node.id));
  container.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (_showContextMenu) _showContextMenu(e.clientX, e.clientY, node.id);
  });

  // Spawn the PTY shell (optionally restore buffer first)
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

  let restoreGuardChunks = 0;
  if (node.restoreTabId) {
    const restoreId = node.restoreTabId;
    node.restoreTabId = null;
    window.termAPI.loadBuffer(restoreId).then((buf) => {
      if (buf) {
        const restored = buf.replace(/\r?\n/g, '\r\n');
        term.write(restored + '\r\n\x1b[2m--- session restored ---\x1b[0m\r\n');
        const { rows } = term;
        term.write('\r\n'.repeat(rows) + '\x1b[2J\x1b[H');
        restoreGuardChunks = 8;
      }
      setTimeout(() => {
        try { fitAddon.fit(); } catch {}
        spawnPty();
      }, 150);
    });
  } else {
    spawnPty();
  }

  let detectTimer = null;
  const tabBar = $('tabBar');
  const offData = window.termAPI.onData(({ id, data }) => {
    if (id !== node.id) return;
    let chunk = data;
    if (restoreGuardChunks > 0) {
      restoreGuardChunks--;
      chunk = chunk
        .replace(/\x1b\[\?1049[hl]/g, '')
        .replace(/\x1b\[[0-3]?J/g, '')
        .replace(/\x1b\[H/g, '')
        .replace(/\x1b\[0?;?0?H/g, '');
    }
    term.write(chunk);
    const activeTabId = getActiveTabId();
    for (const [tabId, t] of tabs) {
      if (treeContainsPane(t.paneTree, node.id) && tabId !== activeTabId) {
        const tabEl = tabBar?.querySelector(`[data-tab-id="${tabId}"]`);
        if (tabEl && !tabEl.classList.contains('tab-activity')) {
          tabEl.classList.add('tab-activity');
        }
        break;
      }
    }
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

  const offExit = window.termAPI.onExit(({ id, exitCode }) => {
    if (id === node.id) {
      term.write(`\r\n\x1b[2m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      updateStatus(`Process exited (${exitCode})`);
    }
  });

  const offCwd = window.termAPI.onCwdChange(({ id, cwd }) => {
    if (id === node.id) {
      const tab = findTabForPane(node.id);
      if (tab && tab.cwd !== cwd) {
        tab.cwd = cwd;
        const settings = getSettings();
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
    if (getBroadcastMode()) {
      for (const pid of getAllPaneIds()) window.termAPI.writePty(pid, data);
    } else {
      window.termAPI.writePty(node.id, data);
    }
  });

  const onBellDisp = term.onBell(() => flashTabBell(node.id));

  node.cleanup = () => {
    offData();
    offExit();
    offCwd();
    onDataDisp.dispose();
    onBellDisp.dispose();
  };

  if (!getFocusedPaneId()) setFocusedPane(node.id);
  return node;
}

/* ---- Tree helpers ---- */
export function treeContainsPane(node, paneId) {
  if (node.type === 'pane') return node.id === paneId;
  return node.children.some(c => treeContainsPane(c, paneId));
}

export function findTabForPane(paneId) {
  for (const [, tab] of tabs) {
    if (treeContainsPane(tab.paneTree, paneId)) return tab;
  }
  return null;
}

export function findTabIdForPane(paneId) {
  for (const [tabId, tab] of tabs) {
    if (treeContainsPane(tab.paneTree, paneId)) return tabId;
  }
  return null;
}

export function setFocusedPane(paneId) {
  setFocusedPaneId(paneId);
  document.querySelectorAll('.pane').forEach(el => {
    el.classList.toggle('focused', el.dataset.paneId === paneId);
  });
  const node = panes.get(paneId);
  if (node?.terminal) node.terminal.focus();
}

/* ---- Status bar update ---- */
import { countPanes } from './utils.js';

export function updateStatusBar() {
  const activeTabId = getActiveTabId();
  const tab = tabs.get(activeTabId);
  const tc = $('statusTabCount');
  if (tc) {
    const total = tabs.size;
    let hiddenCount = 0;
    for (const [, t] of tabs) { if (t.hidden) hiddenCount++; }
    tc.textContent = hiddenCount > 0
      ? `${total} tabs (${hiddenCount} hidden)`
      : `${total} tab${total !== 1 ? 's' : ''}`;
  }
  if (!tab) return;
  const statusShell = $('statusShell');
  if (statusShell) statusShell.textContent = tab.shellName || 'shell';
  const n = countPanes(tab.paneTree);
  const statusPanes = $('statusPanes');
  if (statusPanes) statusPanes.textContent = `${n} pane${n !== 1 ? 's' : ''}`;
  const statusCwd = $('statusCwd');
  if (statusCwd) statusCwd.textContent = tab.cwd || '';
}

/* ---- Render Terminal Area ---- */
export function renderTerminalArea() {
  const activeTabId = getActiveTabId();
  const tab = tabs.get(activeTabId);
  if (!tab) return;

  for (const [, container] of tabDomCache) {
    container.style.display = 'none';
  }

  const termArea = $('terminalArea');
  let cached = tabDomCache.get(activeTabId);
  if (cached) {
    cached.style.display = 'flex';
    requestAnimationFrame(() => {
      fitAllGuarded(tab.paneTree);
      const fpId = getFocusedPaneId();
      if (!fpId || !panes.has(fpId)) {
        const first = findFirstPane(tab.paneTree);
        if (first) setFocusedPane(first.id);
      }
    });
  } else {
    cached = document.createElement('div');
    cached.className = 'tab-terminal-container';
    cached.dataset.tabId = activeTabId;
    cached.appendChild(renderNode(tab.paneTree));
    tabDomCache.set(activeTabId, cached);
    if (termArea) termArea.appendChild(cached);

    requestAnimationFrame(() => {
      fitAll(tab.paneTree);
      const fpId = getFocusedPaneId();
      if (!fpId || !panes.has(fpId)) {
        const first = findFirstPane(tab.paneTree);
        if (first) setFocusedPane(first.id);
      }
    });
  }
}

export function invalidateTabDomCache(tabId) {
  const cached = tabDomCache.get(tabId);
  if (cached) {
    cached.remove();
    tabDomCache.delete(tabId);
  }
}

export function findFirstPane(node) {
  if (!node) return null;
  if (node.type === 'pane') return node;
  return findFirstPane(node.children[0]);
}

export function renderNode(node) {
  if (node.type === 'pane') {
    const div = document.createElement('div');
    div.className = `pane${node.id === getFocusedPaneId() ? ' focused' : ''}`;
    div.dataset.paneId = node.id;
    if (node.terminal) {
      div.appendChild(node.terminal.element);
      requestAnimationFrame(() => { try { node.fitAddon.fit(); } catch {} });
    } else {
      initPane(node, div);
    }
    return div;
  }

  const ctr = document.createElement('div');
  ctr.className = `split-container ${node.direction}`;
  const c0 = renderNode(node.children[0]);
  const c1 = renderNode(node.children[1]);
  const prop = node.direction === 'horizontal' ? 'width' : 'height';
  c0.style[prop] = `${node.sizes[0] * 100}%`;
  c1.style[prop] = `${node.sizes[1] * 100}%`;
  c0.style.flex = 'none';
  c1.style.flex = 'none';

  const handle = document.createElement('div');
  handle.className = `resize-handle ${node.direction}`;
  setupResize(handle, node, c0, c1);

  ctr.appendChild(c0);
  ctr.appendChild(handle);
  ctr.appendChild(c1);
  return ctr;
}

function setupResize(handle, splitNode, el0, el1) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handle.classList.add('active');
    document.body.style.cursor = splitNode.direction === 'horizontal' ? 'col-resize' : 'row-resize';
    const isH = splitNode.direction === 'horizontal';
    const startPos = isH ? e.clientX : e.clientY;
    const r0 = el0.getBoundingClientRect();
    const r1 = el1.getBoundingClientRect();
    const s0 = isH ? r0.width : r0.height;
    const s1 = isH ? r1.width : r1.height;

    const onMove = (e) => {
      const d = (isH ? e.clientX : e.clientY) - startPos;
      const n0 = Math.max(60, s0 + d);
      const n1 = Math.max(60, s1 - d);
      const total = n0 + n1;
      splitNode.sizes = [n0 / total, n1 / total];
      const p = isH ? 'width' : 'height';
      el0.style[p] = `${splitNode.sizes[0] * 100}%`;
      el1.style[p] = `${splitNode.sizes[1] * 100}%`;
      const t = tabs.get(getActiveTabId());
      if (t) fitAllGuarded(t.paneTree);
    };
    const onUp = () => {
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

export function fitAll(node) {
  if (!node) return;
  if (node.type === 'pane') {
    if (node.fitAddon && node.terminal) {
      try {
        node.fitAddon.fit();
        const { cols, rows } = node.terminal;
        window.termAPI.resizePty(node.id, cols, rows);
        lastPaneSize.set(node.id, { cols, rows, ptyCols: cols, ptyRows: rows });
      } catch {}
    }
  } else {
    node.children.forEach(fitAll);
  }
}

export function fitAllGuarded(node) {
  if (!node) return;
  _fitAllGuardedInner(node);
  clearTimeout(getPtyResizeTimer());
  setPtyResizeTimer(setTimeout(() => {
    const tab = tabs.get(getActiveTabId());
    if (tab) _flushPtyResizes(tab.paneTree);
  }, 80));
}

function _fitAllGuardedInner(node) {
  if (node.type === 'pane') {
    if (node.fitAddon && node.terminal) {
      try {
        node.fitAddon.fit();
        const { cols, rows } = node.terminal;
        lastPaneSize.set(node.id, { cols, rows });
      } catch {}
    }
  } else {
    node.children.forEach(_fitAllGuardedInner);
  }
}

function _flushPtyResizes(rootNode) {
  if (!rootNode) return;
  if (rootNode.type === 'pane') {
    if (rootNode.terminal) {
      const prev = lastPaneSize.get(rootNode.id);
      const { cols, rows } = rootNode.terminal;
      if (prev && prev.ptyCols === cols && prev.ptyRows === rows) return;
      window.termAPI.resizePty(rootNode.id, cols, rows);
      const entry = lastPaneSize.get(rootNode.id) || {};
      entry.ptyCols = cols;
      entry.ptyRows = rows;
      lastPaneSize.set(rootNode.id, entry);
    }
  } else {
    rootNode.children.forEach(_flushPtyResizes);
  }
}

/* ---- Split Logic ---- */
import { nextPaneId } from './state.js';

export function splitPane(paneId, direction) {
  const activeTabId = getActiveTabId();
  const tab = tabs.get(activeTabId);
  if (!tab) return;
  const result = findAndReplace(tab.paneTree, paneId, (paneNode) => ({
    type: 'split',
    direction,
    children: [paneNode, createPaneNode(nextPaneId())],
    sizes: [0.5, 0.5],
  }));
  if (result) {
    tab.paneTree = result;
    invalidateTabDomCache(activeTabId);
    renderTerminalArea();
    updateStatusBar();
  }
}

function findAndReplace(node, targetId, fn) {
  if (node.type === 'pane') return node.id === targetId ? fn(node) : null;
  for (let i = 0; i < node.children.length; i++) {
    const r = findAndReplace(node.children[i], targetId, fn);
    if (r) { node.children[i] = r; return node; }
  }
  return null;
}

export function closePaneById(paneId) {
  const activeTabId = getActiveTabId();
  const tab = tabs.get(activeTabId);
  if (!tab) return;
  if (tab.paneTree.type === 'pane' && tab.paneTree.id === paneId) {
    closeTab(activeTabId);
    return;
  }
  const result = removeFromTree(tab.paneTree, paneId);
  if (result) {
    tab.paneTree = result;
    setFocusedPaneId(null);
    invalidateTabDomCache(activeTabId);
    renderTerminalArea();
    updateStatusBar();
  }
}

function removeFromTree(node, targetId) {
  if (node.type === 'pane') return null;
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].type === 'pane' && node.children[i].id === targetId) {
      destroyTree(node.children[i]);
      return node.children[1 - i];
    }
  }
  for (let i = 0; i < node.children.length; i++) {
    const r = removeFromTree(node.children[i], targetId);
    if (r) { node.children[i] = r; return node; }
  }
  return null;
}

/* ---- Pane Navigation ---- */
export function getAllPaneIds() {
  const activeTabId = getActiveTabId();
  const tab = tabs.get(activeTabId);
  if (!tab) return [];
  const ids = [];
  collectPaneIds(tab.paneTree, ids);
  return ids;
}

function collectPaneIds(node, ids) {
  if (node.type === 'pane') { ids.push(node.id); return; }
  node.children.forEach(c => collectPaneIds(c, ids));
}

export function focusNextPane(delta) {
  const ids = getAllPaneIds();
  if (ids.length <= 1) return;
  const idx = ids.indexOf(getFocusedPaneId());
  setFocusedPane(ids[(idx + delta + ids.length) % ids.length]);
}
