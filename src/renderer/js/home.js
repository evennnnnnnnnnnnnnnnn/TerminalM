/* ============================================
   TerminalM — Home Page
   ============================================ */
import {
  tabs, folders,
  getActiveTabId, setActiveTabId,
  getPlayground3D,
} from './state.js';
import { $, escapeHtml, announce, showToast } from './utils.js';
import {
  createTab, closeTab, switchTab, renderTabs,
  getAllTabOrder, reorderFolders,
} from './tabs.js';
import {
  createFolder, moveTabToFolder, ungroupFolder, deleteFolder,
} from './folders.js';
import { scheduleSessionSave } from './session.js';
import { toggleCommandPalette } from './command-palette.js';
import { renderPlayground } from './playground.js';

export function showHomePage() {
  const homePage = $('homePage');
  const termArea = $('terminalArea');
  const mainContent = termArea?.parentElement;
  const playgroundPage = $('playgroundPage');
  const playgroundBtn = $('playgroundBtn');
  if (homePage) homePage.style.display = 'flex';
  if (mainContent) mainContent.style.display = 'none';
  if (playgroundPage) playgroundPage.style.display = 'none';
  if (playgroundBtn) playgroundBtn.classList.remove('active');
  setActiveTabId(null);
  updateHomeContent();
  renderTabs();
  announce('Home page');
}

export function hideHomePage() {
  const homePage = $('homePage');
  const termArea = $('terminalArea');
  const mainContent = termArea?.parentElement;
  const playgroundPage = $('playgroundPage');
  const playgroundBtn = $('playgroundBtn');
  if (homePage) homePage.style.display = 'none';
  if (playgroundPage) playgroundPage.style.display = 'none';
  if (playgroundBtn) playgroundBtn.classList.remove('active');
  if (mainContent) mainContent.style.display = 'flex';
}

export function showPlayground() {
  const homePage = $('homePage');
  const termArea = $('terminalArea');
  const mainContent = termArea?.parentElement;
  const playgroundPage = $('playgroundPage');
  const playgroundBtn = $('playgroundBtn');
  if (playgroundPage) playgroundPage.style.display = 'flex';
  if (playgroundBtn) playgroundBtn.classList.add('active');
  if (homePage) homePage.style.display = 'none';
  if (mainContent) mainContent.style.display = 'none';
  setActiveTabId(null);
  if (!getPlayground3D()) {
    import('./playground.js').then(({ _initPlayground3D }) => _initPlayground3D());
  }
  renderPlayground();
  renderTabs();
  announce('Playground \u2014 3D virtual office');
}

export function togglePlayground() {
  const playgroundPage = $('playgroundPage');
  const isVisible = playgroundPage && playgroundPage.style.display !== 'none';
  if (isVisible) showHomePage();
  else showPlayground();
}

export function updateHomeContent() {
  const sessionSection = $('homeSessionSection');
  const sessionList = $('homeSessionList');
  const emptyState = $('homeEmptyState');
  const hasTabs = tabs.size > 0;

  if (emptyState) emptyState.style.display = hasTabs ? 'none' : 'flex';
  if (sessionSection) sessionSection.style.display = hasTabs ? 'flex' : 'none';
  if (!hasTabs || !sessionList) return;

  sessionList.innerHTML = '';

  const order = getAllTabOrder();
  let currentFolderDiv = null;

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
      const homeFColor = folder.color || 'yellow';
      hdr.innerHTML = `
        <span class="home-folder-chevron">${folder.collapsed ? '&#9654;' : '&#9660;'}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="color: var(--${homeFColor})">
          <path d="M1 3.5C1 2.67 1.67 2 2.5 2H6l1.5 1.5H13.5C14.33 3.5 15 4.17 15 5V12.5C15 13.33 14.33 14 13.5 14H2.5C1.67 14 1 13.33 1 12.5V3.5Z" stroke="currentColor" stroke-width="1.2" fill="none"/>
        </svg>
        <span class="home-folder-label">${escapeHtml(folder.label)}</span>
        <span class="home-folder-count">${folder.tabIds.length}</span>
      `;
      if (folder.color) {
        hdr.style.borderLeftColor = `var(--${folder.color})`;
        hdr.style.borderLeftWidth = '3px';
        hdr.style.borderLeftStyle = 'solid';
      }

      hdr.addEventListener('click', (e) => {
        if (e.target.closest('.home-rename-input')) return;
        folder.collapsed = !folder.collapsed;
        updateHomeContent();
        scheduleSessionSave();
      });

      hdr.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lbl = hdr.querySelector('.home-folder-label');
        if (!lbl) return;
        const inp = document.createElement('input');
        inp.className = 'home-rename-input';
        inp.value = folder.label;
        inp.maxLength = 30;
        lbl.replaceWith(inp);
        inp.focus();
        inp.select();
        const done = () => {
          folder.label = inp.value.trim() || folder.label;
          updateHomeContent();
          scheduleSessionSave();
        };
        inp.addEventListener('blur', done);
        inp.addEventListener('click', (ev) => ev.stopPropagation());
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') inp.blur();
          if (ev.key === 'Escape') { inp.value = folder.label; inp.blur(); }
        });
      });

      hdr.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showHomeFolderContextMenu(e.clientX, e.clientY, item.id);
      });

      setupHomeFolderDnD(folderDiv, hdr, item.id);

      folderDiv.appendChild(hdr);
      const content = document.createElement('div');
      content.className = 'home-folder-content';
      if (folder.collapsed) content.style.display = 'none';
      folderDiv.appendChild(content);
      currentFolderDiv = folder.collapsed ? null : content;
      sessionList.appendChild(folderDiv);

    } else if (item.type === 'tab') {
      const tab = tabs.get(item.id);
      if (!tab) continue;
      const card = buildTabCard(item.id, tab);
      if (item.inFolder && currentFolderDiv) {
        currentFolderDiv.appendChild(card);
      } else {
        currentFolderDiv = null;
        sessionList.appendChild(card);
      }
    }
  }
}

function setupHomeFolderDnD(folderDiv, hdr, folderId) {
  hdr.draggable = true;
  hdr.addEventListener('dragstart', (e) => {
    e.stopPropagation();
    folderDiv.classList.add('dragging');
    e.dataTransfer.setData('text/plain', 'folder:' + folderId);
    e.dataTransfer.effectAllowed = 'move';
  });
  hdr.addEventListener('dragend', () => {
    folderDiv.classList.remove('dragging');
    document.querySelectorAll('.home-folder-header').forEach(h => {
      h.classList.remove('drag-over-inside', 'drag-over-above', 'drag-over-below');
    });
  });
  hdr.addEventListener('dragover', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    hdr.classList.remove('drag-over-inside', 'drag-over-above', 'drag-over-below');
    hdr.classList.add('drag-over-inside');
  });
  hdr.addEventListener('dragleave', () => {
    hdr.classList.remove('drag-over-inside', 'drag-over-above', 'drag-over-below');
  });
  hdr.addEventListener('drop', (e) => {
    if (e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    hdr.classList.remove('drag-over-inside', 'drag-over-above', 'drag-over-below');
    const data = e.dataTransfer.getData('text/plain');
    if (data && data.startsWith('folder:')) {
      const srcFolderId = data.slice(7);
      if (srcFolderId !== folderId) {
        reorderFolders(srcFolderId, folderId);
        updateHomeContent();
      }
    } else if (data && tabs.has(data)) {
      moveTabToFolder(data, folderId);
      updateHomeContent();
    }
  });
}

/* ---- Home page context menus ---- */
function showHomeTabContextMenu(x, y, tabId) {
  import('./context-menu.js').then(({ hideAllContextMenus }) => hideAllContextMenus());
  const menu = $('homeContextMenu');
  if (!menu) return;
  const tab = tabs.get(tabId);
  if (!tab) return;
  menu.dataset.targetId = tabId;
  menu.dataset.targetType = 'tab';
  menu.querySelectorAll('[data-scope]').forEach(el => {
    el.style.display = el.dataset.scope === 'folder' ? 'none' : '';
  });
  const lockItem = menu.querySelector('[data-action="home-lock"]');
  if (lockItem) {
    lockItem.textContent = tab.locked ? 'Unlock Terminal' : 'Lock Terminal';
    lockItem.style.display = '';
  }
  const hideItem = menu.querySelector('[data-action="home-hide"]');
  if (hideItem) {
    hideItem.textContent = tab.hidden ? 'Show in Tab Bar' : 'Hide from Tab Bar';
    hideItem.style.display = '';
  }
  const closeItem = menu.querySelector('[data-action="home-close"]');
  if (closeItem) closeItem.style.display = tab.locked ? 'none' : '';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  menu.style.left = `${Math.min(x, vw - 200)}px`;
  menu.style.top = `${Math.min(y, vh - 200)}px`;
  menu.classList.add('visible');
}

function showHomeFolderContextMenu(x, y, folderId) {
  import('./context-menu.js').then(({ hideAllContextMenus }) => hideAllContextMenus());
  const menu = $('homeContextMenu');
  if (!menu) return;
  menu.dataset.targetId = folderId;
  menu.dataset.targetType = 'folder';
  menu.querySelectorAll('[data-scope]').forEach(el => {
    const scope = el.dataset.scope;
    el.style.display = (scope === 'tab') ? 'none' : '';
  });
  menu.querySelectorAll('[data-scope="folder"]').forEach(el => { el.style.display = ''; });
  const lockItem = menu.querySelector('[data-action="home-lock"]');
  if (lockItem) lockItem.style.display = 'none';
  const closeItem = menu.querySelector('[data-action="home-close"]');
  if (closeItem) closeItem.style.display = 'none';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  menu.style.left = `${Math.min(x, vw - 200)}px`;
  menu.style.top = `${Math.min(y, vh - 200)}px`;
  menu.classList.add('visible');
}

function buildTabCard(tabId, tab) {
  const card = document.createElement('div');
  card.className = `home-tab-card${tab.hidden ? ' home-tab-hidden' : ''}${tab.pinned ? ' home-tab-pinned' : ''}`;
  card.draggable = !tab.pinned;
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

  card.addEventListener('click', (e) => {
    if (e.target.closest('.home-rename-input')) return;
    switchTab(tabId);
    if (tab.hidden) {
      showToast('This tab is hidden from the tab bar. Right-click to unhide.', 'info', 3000);
    }
  });

  card.addEventListener('dblclick', (e) => {
    e.preventDefault();
    const lbl = card.querySelector('.home-tab-card-label');
    if (!lbl) return;
    const inp = document.createElement('input');
    inp.className = 'home-rename-input';
    inp.value = tab.label;
    inp.maxLength = 30;
    lbl.replaceWith(inp);
    inp.focus();
    inp.select();
    const done = () => {
      tab.label = inp.value.trim() || tab.label;
      updateHomeContent();
      renderTabs();
      scheduleSessionSave();
    };
    inp.addEventListener('blur', done);
    inp.addEventListener('click', (ev) => ev.stopPropagation());
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') inp.blur();
      if (ev.key === 'Escape') { inp.value = tab.label; inp.blur(); }
    });
  });

  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showHomeTabContextMenu(e.clientX, e.clientY, tabId);
  });

  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') switchTab(tabId);
    if (e.key === 'Delete' && !tab.locked && !tab.pinned) closeTab(tabId);
  });

  // DnD
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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
      const fromTab = tabs.get(fromId);
      if (fromTab.folderId) {
        const oldFolder = folders.get(fromTab.folderId);
        if (oldFolder) oldFolder.tabIds = oldFolder.tabIds.filter(id => id !== fromId);
      }
      import('./state.js').then(({ getTabOrder, setTabOrder }) => {
        let tabOrder = getTabOrder().filter(i => !(i.type === 'tab' && i.id === fromId));
        setTabOrder(tabOrder);

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
          tabOrder = getTabOrder();
          const idx = tabOrder.findIndex(i => i.type === 'tab' && i.id === tabId);
          const rect = card.getBoundingClientRect();
          const insertIdx = e.clientY < rect.top + rect.height / 2 ? idx : idx + 1;
          tabOrder.splice(insertIdx < 0 ? tabOrder.length : insertIdx, 0, { type: 'tab', id: fromId });
        }

        renderTabs();
        updateHomeContent();
        scheduleSessionSave();
      });
    }
  });

  return card;
}

export function initHomeListeners() {
  // Home page action buttons
  $('homeNewTab')?.addEventListener('click', () => createTab());
  $('homeNewFolder')?.addEventListener('click', () => createFolder());
  $('homeCommandPalette')?.addEventListener('click', () => toggleCommandPalette());
  $('homeNewTab2')?.addEventListener('click', () => createTab());
  $('homeNewFolder2')?.addEventListener('click', () => createFolder());

  // Home context menu actions
  const menu = $('homeContextMenu');
  if (menu) {
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.context-menu-item');
      if (!item) return;
      const action = item.dataset.action;
      const targetId = menu.dataset.targetId;
      const targetType = menu.dataset.targetType;

      if (targetType === 'tab') {
        const tab = tabs.get(targetId);
        if (action === 'home-rename') {
          const card = document.querySelector(`.home-tab-card[data-tab-id="${targetId}"]`);
          if (card) card.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        } else if (action === 'home-lock') {
          if (tab) {
            tab.locked = !tab.locked;
            renderTabs();
            updateHomeContent();
            scheduleSessionSave();
          }
        } else if (action === 'home-hide') {
          if (tab) {
            tab.hidden = !tab.hidden;
            renderTabs();
            updateHomeContent();
            scheduleSessionSave();
          }
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
  }

  // Session list drop zone
  const sl = $('homeSessionList');
  if (sl) {
    sl.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('Files')) return;
      if (e.target.closest('.home-tab-card') || e.target.closest('.home-folder-header')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
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
  }

  // Button handlers
  $('homeBtn')?.addEventListener('click', () => showHomePage());
  $('playgroundBtn')?.addEventListener('click', () => togglePlayground());

  // Keyboard support for tab bar buttons
  [$('homeBtn'), $('featureBtn'), $('playgroundBtn')].forEach(btn => {
    if (btn) {
      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
      });
    }
  });
}
