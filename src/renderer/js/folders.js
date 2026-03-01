/* ============================================
   TerminalM — Folders
   ============================================ */
import {
  tabs, folders,
  getTabOrder,
  nextFolderId, getFolderCounter,
} from './state.js';
import { $ } from './utils.js';
import { closeTab, renderTabs, addTabToOrder, removeFromOrder } from './tabs.js';
import { scheduleSessionSave } from './session.js';

/* Lazy-bound home callbacks */
let _updateHomeContent = null;
export function setHomeUpdateCallback(fn) { _updateHomeContent = fn; }

export function createFolder(label, rootPath) {
  const folderId = nextFolderId();
  folders.set(folderId, {
    label: label || `Folder ${getFolderCounter()}`,
    collapsed: false,
    tabIds: [],
    rootPath: rootPath || null,
  });
  getTabOrder().push({ type: 'folder', id: folderId });
  renderTabs();
  const homePage = $('homePage');
  if (homePage && homePage.style.display !== 'none' && _updateHomeContent) {
    _updateHomeContent();
  }
  scheduleSessionSave();
  return folderId;
}

export function moveTabToFolder(tabId, folderId) {
  const tab = tabs.get(tabId);
  if (!tab) return;

  if (tab.folderId) {
    const old = folders.get(tab.folderId);
    if (old) old.tabIds = old.tabIds.filter(id => id !== tabId);
  }

  // Remove from top-level tabOrder
  const tabOrder = getTabOrder();
  const idx = tabOrder.findIndex(item => item.type === 'tab' && item.id === tabId);
  if (idx !== -1) tabOrder.splice(idx, 1);

  if (folderId) {
    const folder = folders.get(folderId);
    if (folder) {
      folder.tabIds.push(tabId);
      tab.folderId = folderId;
    }
  } else {
    tab.folderId = null;
    addTabToOrder(tabId);
  }
  renderTabs();
  const homePage = $('homePage');
  if (homePage && homePage.style.display !== 'none' && _updateHomeContent) {
    _updateHomeContent();
  }
  scheduleSessionSave();
}

export function ungroupFolder(folderId) {
  const folder = folders.get(folderId);
  if (!folder) return;
  const tabOrder = getTabOrder();
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

export function deleteFolder(folderId, skipConfirm) {
  const folder = folders.get(folderId);
  if (!folder) return;
  if (!skipConfirm && folder.tabIds.length > 0) {
    const count = folder.tabIds.length;
    const lockedCount = folder.tabIds.filter(tid => tabs.get(tid)?.locked).length;
    const msg = lockedCount > 0
      ? `Delete folder "${folder.label}" and close ${count} terminal${count !== 1 ? 's' : ''} (${lockedCount} locked)?`
      : `Delete folder "${folder.label}" and close ${count} terminal${count !== 1 ? 's' : ''}?`;
    if (!confirm(msg)) return;
  }
  for (const tid of folder.tabIds) {
    const tab = tabs.get(tid);
    if (tab) tab.locked = false;
  }
  for (const tid of [...folder.tabIds]) closeTab(tid);
  removeFromOrder(folderId);
  folders.delete(folderId);
  renderTabs();
  scheduleSessionSave();
}

export function toggleFolderCollapse(folderId) {
  const f = folders.get(folderId);
  if (f) {
    f.collapsed = !f.collapsed;
    renderTabs();
  }
}
