/* ============================================
   TerminalM — Feature Dropdown Menu
   ============================================ */
import {
  tabs,
  getActiveTabId, getFocusedPaneId,
  getFeatureMenuOpen, setFeatureMenuOpen,
} from './state.js';
import { $, escapeHtml, announce, showToast } from './utils.js';
import {
  createTab, closeTab, renderTabs,
  duplicateTab, closeOtherTabs,
  cycleTab, reopenLastClosedTab,
  clearTerminal, exportTerminalOutput,
  hideTab, showHiddenTabsMenu, togglePinTab,
} from './tabs.js';
import { createFolder } from './folders.js';
import { splitPane, closePaneById, focusNextPane } from './panes.js';
import { toggleSearch } from './search.js';
import { toggleBroadcast } from './broadcast.js';
import { toggleTheme } from './theme.js';
import { zoomIn, zoomOut, zoomReset } from './zoom.js';
import { toggleSidePanel } from './quick-commands.js';
import { toggleCommandPalette } from './command-palette.js';
import { openSettings } from './settings.js';
import { closeSettings } from './settings.js';
import { buildSessionData, scheduleSessionSave } from './session.js';
import { showHomePage, togglePlayground } from './home.js';

export const FEATURE_ITEMS = [
  { label: 'New Tab',               hint: 'Ctrl+T',       action: () => createTab() },
  { label: 'New Folder',            hint: '',              action: () => createFolder() },
  { label: 'Reopen Closed Tab',     hint: 'Ctrl+Shift+T', action: () => reopenLastClosedTab() },
  { sep: true },
  { label: 'Split Right',           hint: 'Ctrl+Shift+D', action: () => { if (getFocusedPaneId()) splitPane(getFocusedPaneId(), 'horizontal'); } },
  { label: 'Split Down',            hint: 'Ctrl+Shift+E', action: () => { if (getFocusedPaneId()) splitPane(getFocusedPaneId(), 'vertical'); } },
  { label: 'Close Pane',            hint: '',              action: () => { if (getFocusedPaneId()) closePaneById(getFocusedPaneId()); } },
  { sep: true },
  { label: 'Find in Terminal',      hint: 'Ctrl+Shift+F', action: () => toggleSearch() },
  { label: 'Clear Terminal',        hint: 'Ctrl+L',       action: () => { if (getActiveTabId()) clearTerminal(getActiveTabId()); } },
  { label: 'Toggle Broadcast Mode', hint: '',              action: () => toggleBroadcast() },
  { sep: true },
  { label: 'Duplicate Tab',         hint: '',              action: () => { if (getActiveTabId()) duplicateTab(getActiveTabId()); } },
  { label: 'Close Other Tabs',      hint: '',              action: () => { if (getActiveTabId()) closeOtherTabs(getActiveTabId()); } },
  { sep: true },
  { label: 'Toggle Playground',     hint: '',              action: () => togglePlayground() },
  { label: 'Quick Commands',        hint: '',              action: () => toggleSidePanel() },
  { label: 'Show Home',             hint: '',              action: () => showHomePage() },
  { sep: true },
  { label: 'Hide Current Tab',      hint: '',              action: () => { if (getActiveTabId()) hideTab(getActiveTabId()); } },
  { label: 'Show Hidden Tabs',      hint: '',              action: () => showHiddenTabsMenu() },
  { label: 'Pin/Unpin Current Tab', hint: '',              action: () => { if (getActiveTabId()) togglePinTab(getActiveTabId()); } },
  { label: 'Lock Current Tab',      hint: '',              action: () => {
    const t = tabs.get(getActiveTabId());
    if (t) {
      t.locked = !t.locked;
      renderTabs();
      scheduleSessionSave();
      announce(t.locked ? 'Terminal locked' : 'Terminal unlocked');
    }
  }},
  { label: 'Export Output to File', hint: '',              action: () => { if (getActiveTabId()) exportTerminalOutput(getActiveTabId()); } },
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
  { label: 'Save Session',          hint: '',              action: () => {
    window.termAPI.saveSession(buildSessionData());
    showToast('Session saved', 'success');
  }},
];

function renderFeatureMenu() {
  const menu = $('featureMenu');
  if (!menu) return;
  menu.innerHTML = '';
  for (const item of FEATURE_ITEMS) {
    if (item.sep) {
      const sep = document.createElement('div');
      sep.className = 'feature-menu-sep';
      sep.setAttribute('role', 'separator');
      menu.appendChild(sep);
      continue;
    }
    const el = document.createElement('div');
    el.className = 'feature-menu-item';
    el.setAttribute('role', 'menuitem');
    el.innerHTML = `<span>${escapeHtml(item.label)}</span>${item.hint ? `<span class="hint">${escapeHtml(item.hint)}</span>` : ''}`;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      closeFeatureMenu();
      item.action();
    });
    menu.appendChild(el);
  }
}

function openFeatureMenu() {
  setFeatureMenuOpen(true);
  const featureBtn = $('featureBtn');
  const menu = $('featureMenu');
  if (!featureBtn || !menu) return;
  const rect = featureBtn.getBoundingClientRect();
  if (document.body.classList.contains('vertical-nav')) {
    menu.style.left = `${rect.right}px`;
    menu.style.top = `${rect.top}px`;
  } else {
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom}px`;
  }
  menu.classList.add('visible');
  featureBtn.classList.add('open');
  featureBtn.setAttribute('aria-expanded', 'true');
}

export function closeFeatureMenu() {
  setFeatureMenuOpen(false);
  const menu = $('featureMenu');
  const featureBtn = $('featureBtn');
  if (menu) menu.classList.remove('visible');
  if (featureBtn) {
    featureBtn.classList.remove('open');
    featureBtn.setAttribute('aria-expanded', 'false');
  }
}

export function toggleFeatureMenu() {
  if (getFeatureMenuOpen()) closeFeatureMenu();
  else { renderFeatureMenu(); openFeatureMenu(); }
}

export function initFeatureMenuListeners() {
  $('featureBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFeatureMenu();
  });
  document.addEventListener('click', () => {
    if (getFeatureMenuOpen()) closeFeatureMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (getFeatureMenuOpen()) closeFeatureMenu();
      closeSettings();
    }
  });
}
