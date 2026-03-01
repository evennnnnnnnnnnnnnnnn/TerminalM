/* ============================================
   TerminalM — Context Menus
   ============================================ */
import {
  tabs, folders, panes,
  getContextTabId, setContextTabId,
  getContextPaneId, setContextPaneId,
  getContextFolderId, setContextFolderId,
  getActiveTabId,
  manuallyRenamed,
} from './state.js';
import { $, escapeHtml, announce, showToast } from './utils.js';
import {
  createTab, startRenameTab, startRenameFolder, renderTabs,
  duplicateTab, togglePinTab, closeTab, closeOtherTabs, closeTabsToRight,
  clearTerminal, exportTerminalOutput, hideTab, showHiddenTabsMenu,
} from './tabs.js';
import { createFolder, moveTabToFolder, ungroupFolder, deleteFolder } from './folders.js';
import { splitPane, closePaneById } from './panes.js';
import { toggleSearch } from './search.js';
import { scheduleSessionSave } from './session.js';

export function hideAllContextMenus() {
  const ctxMenu = $('contextMenu');
  const tabCtxMenu = $('tabContextMenu');
  const folderCtxMenu = $('folderContextMenu');
  if (ctxMenu) ctxMenu.classList.remove('visible');
  if (tabCtxMenu) tabCtxMenu.classList.remove('visible');
  if (folderCtxMenu) folderCtxMenu.classList.remove('visible');
  const homeCtx = $('homeContextMenu');
  if (homeCtx) homeCtx.classList.remove('visible');
  const folderPicker = $('folderPickerMenu');
  if (folderPicker) folderPicker.remove();
}

/* ---- Pane context menu ---- */
export function showContextMenu(x, y, paneId) {
  setContextPaneId(paneId);
  hideAllContextMenus();
  const ctxMenu = $('contextMenu');
  const node = panes.get(paneId);
  const copyItem = $('ctxCopyItem');
  if (copyItem) {
    const hasSel = node?.terminal?.getSelection();
    copyItem.classList.toggle('disabled', !hasSel);
    copyItem.style.opacity = hasSel ? '' : '0.4';
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (ctxMenu) {
    ctxMenu.style.left = `${Math.min(x, vw - 200)}px`;
    ctxMenu.style.top = `${Math.min(y, vh - 180)}px`;
    ctxMenu.classList.add('visible');
  }
}

/* ---- Tab context menu ---- */
export function showTabContextMenu(x, y, tabId) {
  setContextTabId(tabId);
  hideAllContextMenus();
  const tabCtxMenu = $('tabContextMenu');
  const tab = tabs.get(tabId);
  const lockItem = $('lockTabMenuItem');
  if (lockItem && tab) lockItem.textContent = tab.locked ? 'Unlock Terminal' : 'Lock Terminal';
  const pinItem = $('pinTabMenuItem');
  if (pinItem && tab) pinItem.textContent = tab.pinned ? 'Unpin Tab' : 'Pin Tab';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (tabCtxMenu) {
    tabCtxMenu.style.left = `${Math.min(x, vw - 220)}px`;
    tabCtxMenu.style.top = `${Math.min(y, vh - 250)}px`;
    tabCtxMenu.classList.add('visible');
  }
}

/* ---- Folder context menu ---- */
export function showFolderContextMenu(x, y, folderId) {
  setContextFolderId(folderId);
  hideAllContextMenus();
  const folderCtxMenu = $('folderContextMenu');
  const folder = folders.get(folderId);
  const rootPathItem = $('setRootPathMenuItem');
  if (rootPathItem && folder) {
    rootPathItem.textContent = folder.rootPath
      ? `Root Path: ${folder.rootPath.split(/[/\\]/).pop()}`
      : 'Set Root Path...';
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (folderCtxMenu) {
    folderCtxMenu.style.left = `${Math.min(x, vw - 200)}px`;
    folderCtxMenu.style.top = `${Math.min(y, vh - 150)}px`;
    folderCtxMenu.classList.add('visible');
  }
}

/* ---- Move-to-folder submenu ---- */
function showMoveToFolderMenu(tabId) {
  const tabCtxMenu = $('tabContextMenu');
  const rect = tabCtxMenu?.getBoundingClientRect();
  if (tabCtxMenu) tabCtxMenu.classList.remove('visible');

  const picker = document.createElement('div');
  picker.className = 'context-menu visible';
  picker.style.cssText = `left:${rect?.left || 0}px; top:${rect?.top || 0}px; opacity:1; transform:scale(1); pointer-events:auto;`;
  picker.id = 'folderPickerMenu';

  const header = document.createElement('div');
  header.className = 'context-menu-label';
  header.textContent = 'Move to Folder';
  picker.appendChild(header);

  const sep0 = document.createElement('div');
  sep0.className = 'context-menu-sep';
  picker.appendChild(sep0);

  const nf = document.createElement('div');
  nf.className = 'context-menu-item';
  nf.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right:6px;vertical-align:middle;flex-shrink:0"><line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>New Folder';
  nf.addEventListener('click', (e) => {
    e.stopPropagation();
    const fid = createFolder();
    moveTabToFolder(tabId, fid);
    picker.remove();
  });
  picker.appendChild(nf);

  const tab = tabs.get(tabId);
  if (tab?.folderId) {
    const rf = document.createElement('div');
    rf.className = 'context-menu-item';
    rf.innerHTML = '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right:6px;vertical-align:middle;flex-shrink:0"><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Remove from Folder';
    rf.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTabToFolder(tabId, null);
      picker.remove();
    });
    picker.appendChild(rf);
  }

  if (folders.size > 0) {
    const sep = document.createElement('div');
    sep.className = 'context-menu-sep';
    picker.appendChild(sep);
  }

  for (const [fid, folder] of folders) {
    if (tab?.folderId === fid) continue;
    const fi = document.createElement('div');
    fi.className = 'context-menu-item';
    fi.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="margin-right:6px;vertical-align:middle;flex-shrink:0"><path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5C14.33 3.5 15 4.17 15 5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V3.5Z" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>${escapeHtml(folder.label)}`;
    fi.addEventListener('click', (e) => {
      e.stopPropagation();
      moveTabToFolder(tabId, fid);
      picker.remove();
    });
    picker.appendChild(fi);
  }

  picker.addEventListener('click', (e) => e.stopPropagation());
  document.body.appendChild(picker);

  const closePicker = (e) => {
    if (!picker.contains(e.target)) {
      picker.remove();
      document.removeEventListener('mousedown', closePicker);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closePicker), 0);

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      picker.remove();
      document.removeEventListener('keydown', escHandler);
      document.removeEventListener('mousedown', closePicker);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/* ---- Init all context menu listeners ---- */
export function initContextMenuListeners() {
  document.addEventListener('click', () => hideAllContextMenus());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAllContextMenus();
  });

  // Pane context menu actions
  const ctxMenu = $('contextMenu');
  if (ctxMenu) {
    ctxMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const a = item.dataset.action;
        const paneId = getContextPaneId();
        if (a === 'copy') {
          const node = panes.get(paneId);
          const sel = node?.terminal?.getSelection();
          if (sel) { navigator.clipboard.writeText(sel); node.terminal.clearSelection(); }
        } else if (a === 'paste') {
          navigator.clipboard.readText().then(text => {
            if (text) window.termAPI.writePty(paneId, text);
          });
        } else if (a === 'split-h') { splitPane(paneId, 'horizontal'); }
        else if (a === 'split-v') { splitPane(paneId, 'vertical'); }
        else if (a === 'close') { closePaneById(paneId); }
        else if (a === 'search') { toggleSearch(); }
        ctxMenu.classList.remove('visible');
      });
    });
  }

  // Tab context menu actions
  const tabCtxMenu = $('tabContextMenu');
  if (tabCtxMenu) {
    tabCtxMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const a = item.dataset.action;
        const ctxTabId = getContextTabId();
        if (a === 'rename-tab') {
          const tabBar = $('tabBar');
          const el = tabBar?.querySelector(`[data-tab-id="${ctxTabId}"]`);
          if (el) { manuallyRenamed.add(ctxTabId); startRenameTab(el, ctxTabId); }
        } else if (a === 'duplicate-tab') { duplicateTab(ctxTabId); }
        else if (a === 'pin-tab') { togglePinTab(ctxTabId); }
        else if (a === 'lock-tab') {
          const t = tabs.get(ctxTabId);
          if (t) {
            t.locked = !t.locked;
            renderTabs();
            scheduleSessionSave();
            announce(t.locked ? 'Terminal locked' : 'Terminal unlocked');
          }
        } else if (a === 'move-to-folder') {
          e.stopPropagation();
          showMoveToFolderMenu(ctxTabId);
          return;
        } else if (a === 'clear-terminal') { clearTerminal(ctxTabId); }
        else if (a === 'export-output') { exportTerminalOutput(ctxTabId); }
        else if (a === 'hide-tab') { hideTab(ctxTabId); }
        else if (a === 'show-hidden') { showHiddenTabsMenu(); }
        else if (a === 'close-tab') { closeTab(ctxTabId); }
        else if (a === 'close-others') { closeOtherTabs(ctxTabId); }
        else if (a === 'close-tabs-right') { closeTabsToRight(ctxTabId); }
        tabCtxMenu.classList.remove('visible');
      });
    });
  }

  // Tab color swatches
  document.querySelectorAll('#tabColorRow .tab-color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      const ctxTabId = getContextTabId();
      if (ctxTabId) {
        const tab = tabs.get(ctxTabId);
        if (tab) {
          tab.color = sw.dataset.color || null;
          renderTabs();
          scheduleSessionSave();
        }
      }
      if (tabCtxMenu) tabCtxMenu.classList.remove('visible');
    });
  });

  // Folder context menu actions
  const folderCtxMenu = $('folderContextMenu');
  if (folderCtxMenu) {
    folderCtxMenu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const a = item.dataset.action;
        const ctxFolderId = getContextFolderId();
        if (a === 'new-tab-in-folder') { createTab(ctxFolderId); }
        else if (a === 'rename-folder') {
          const tabBar = $('tabBar');
          const h = tabBar?.querySelector(`[data-folder-id="${ctxFolderId}"] .folder-header`);
          if (h) startRenameFolder(h, ctxFolderId);
        } else if (a === 'set-root-path') {
          const folder = folders.get(ctxFolderId);
          if (folder) {
            window.termAPI.showOpenDialog?.({ properties: ['openDirectory'] }).then(result => {
              if (result && result.length > 0) {
                folder.rootPath = result[0];
                scheduleSessionSave();
              }
            });
          }
        } else if (a === 'ungroup-folder') { ungroupFolder(ctxFolderId); }
        else if (a === 'delete-folder') { deleteFolder(ctxFolderId); }
        folderCtxMenu.classList.remove('visible');
      });
    });
  }

  // Folder color swatches
  document.querySelectorAll('#folderColorRow .tab-color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      const ctxFolderId = getContextFolderId();
      if (ctxFolderId) {
        const folder = folders.get(ctxFolderId);
        if (folder) {
          folder.color = sw.dataset.color || null;
          renderTabs();
          const homePage = $('homePage');
          if (homePage && homePage.style.display !== 'none') {
            import('./home.js').then(({ updateHomeContent }) => updateHomeContent());
          }
          scheduleSessionSave();
        }
      }
      if (folderCtxMenu) folderCtxMenu.classList.remove('visible');
    });
  });
}
