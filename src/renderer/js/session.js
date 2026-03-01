/* ============================================
   TerminalM — Session Persistence
   ============================================ */
import {
  tabs, folders,
  getTabOrder, setTabOrder,
  getActiveTabId,
  getFontSize, setFontSize,
  getSessionSaveTimer, setSessionSaveTimer,
  setTabCounter, setFolderCounter,
  nextPaneId,
  manuallyRenamed,
} from './state.js';
import { createPaneNode } from './panes.js';
import { switchTab, renderTabs } from './tabs.js';
import { dismissWelcome } from './welcome.js';

export function buildSessionData() {
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
      color: folder.color || null,
      rootPath: folder.rootPath || null,
      tabIds: [...folder.tabIds],
    });
  }

  return {
    tabs: sessionTabs,
    folders: sessionFolders,
    tabOrder: getTabOrder().map(item => ({ type: item.type, id: item.id })),
    activeTabId: getActiveTabId(),
    fontSize: getFontSize(),
  };
}

function extractPaneBuffer(node) {
  if (!node) return '';
  if (node.type === 'pane' && node.terminal) {
    const buf = node.terminal.buffer.active;
    const lines = [];
    const totalRows = buf.length;
    for (let i = 0; i < totalRows; i++) {
      const line = buf.getLine(i);
      if (line) lines.push(line.translateToString(true));
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
    return lines.join('\n');
  }
  if (node.type === 'split' && node.children) {
    return node.children.map(extractPaneBuffer).filter(Boolean).join('\n---split---\n');
  }
  return '';
}

export function getTerminalBuffer(tabId) {
  const tab = tabs.get(tabId);
  if (!tab || !tab.paneTree) return '';
  return extractPaneBuffer(tab.paneTree);
}

export function saveAllBuffersSync() {
  const buffers = [];
  for (const [tabId] of tabs) {
    const content = getTerminalBuffer(tabId);
    buffers.push({ tabId, content });
  }
  window.termAPI.saveBuffersSync(buffers);
}

export function scheduleSessionSave() {
  const existing = getSessionSaveTimer();
  if (existing) clearTimeout(existing);
  setSessionSaveTimer(setTimeout(() => {
    window.termAPI.saveSession(buildSessionData());
  }, 1000));
}

export async function restoreSession() {
  const session = await window.termAPI.loadSession();
  if (!session || !session.tabs || session.tabs.length === 0) return false;

  // Restore folders first
  for (const sf of (session.folders || [])) {
    const id = sf.id;
    const num = parseInt(id.replace('folder-', ''));
    if (num > 0) setFolderCounter(Math.max(num, 0));
    folders.set(id, {
      label: sf.label,
      collapsed: sf.collapsed || false,
      color: sf.color || null,
      rootPath: sf.rootPath || null,
      tabIds: [],
    });
  }

  // Restore tab order
  setTabOrder((session.tabOrder || []).map(item => ({ type: item.type, id: item.id })));

  // Restore tabs
  for (const st of session.tabs) {
    const id = st.id;
    const num = parseInt(id.replace('tab-', ''));
    if (num > 0) setTabCounter(Math.max(num, 0));
    const paneId = nextPaneId();
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

    if (st.label && !/^Terminal \d+$/.test(st.label)) {
      manuallyRenamed.add(id);
    }

    if (st.folderId && !st.pinned) {
      const folder = folders.get(st.folderId);
      if (folder) folder.tabIds.push(id);
    }
  }

  if (session.fontSize) setFontSize(session.fontSize);

  renderTabs();

  const targetTab = session.activeTabId && tabs.has(session.activeTabId)
    ? session.activeTabId
    : [...tabs.keys()][0];

  if (targetTab) {
    switchTab(targetTab);
    dismissWelcome();
  }

  return true;
}

export function initSessionBeforeUnload() {
  window.addEventListener('beforeunload', () => {
    window.termAPI.saveSessionSync(buildSessionData());
    saveAllBuffersSync();
  });
}
