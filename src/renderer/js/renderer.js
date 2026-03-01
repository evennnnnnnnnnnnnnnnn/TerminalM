/* ============================================
   TerminalM — Boot Module
   ============================================ */

// ---- Foundation ----
import { tabs, getActiveTabId, getFocusedPaneId, getWelcomeShown } from './state.js';
import { $, updateStatus } from './utils.js';

// ---- Theme ----
import { applyTheme, getThemeName, initThemeListeners } from './theme.js';

// ---- Panes ----
import { splitPane, closePaneById, fitAllGuarded, setShowContextMenu } from './panes.js';

// ---- Tabs ----
import {
  createTab, closeTab, switchTab, renderTabs,
  reopenLastClosedTab, cycleTab,
  clearTerminal, duplicateTab, closeOtherTabs,
  hideTab, showHiddenTabsMenu, togglePinTab, exportTerminalOutput,
  setHomeCallbacks, setContextMenuCallbacks,
} from './tabs.js';

// ---- Folders ----
import { createFolder, setHomeUpdateCallback } from './folders.js';

// ---- Session ----
import {
  buildSessionData, restoreSession, scheduleSessionSave,
  initSessionBeforeUnload,
} from './session.js';

// ---- Leaf modules ----
import { zoomIn, zoomOut, zoomReset } from './zoom.js';
import { toggleSearch, initSearchListeners } from './search.js';
import { toggleBroadcast, initBroadcastListeners } from './broadcast.js';
import { initWelcome, dismissWelcome, setCreateTab, initWelcomeListeners } from './welcome.js';

// ---- UI modules ----
import { showContextMenu, showTabContextMenu, showFolderContextMenu, initContextMenuListeners } from './context-menu.js';
import { toggleCommandPalette, setFeatureItemsGetter, initCommandPaletteListeners } from './command-palette.js';
import { applyUiScale, applyTabBarPosition, openSettings, initSettingsListeners } from './settings.js';
import { toggleSidePanel, renderQuickCommands, initQuickCommandListeners } from './quick-commands.js';
import { showHomePage, hideHomePage, updateHomeContent, togglePlayground, initHomeListeners } from './home.js';
import { initPlaygroundListeners } from './playground.js';
import { FEATURE_ITEMS, toggleFeatureMenu, closeFeatureMenu, initFeatureMenuListeners } from './feature-menu.js';
import { initKeyboardShortcuts } from './keyboard.js';
import { setupDragDrop } from './drag-drop.js';

/* ===========================
   WIRE CIRCULAR DEPENDENCIES
   =========================== */
setHomeCallbacks(showHomePage, hideHomePage, updateHomeContent);
setContextMenuCallbacks(showTabContextMenu, showFolderContextMenu);
setShowContextMenu(showContextMenu);
setHomeUpdateCallback(updateHomeContent);
setCreateTab(createTab);
setFeatureItemsGetter(() => FEATURE_ITEMS);

/* ===========================
   INIT LISTENERS
   =========================== */
initThemeListeners();
initSearchListeners();
initBroadcastListeners();
initWelcomeListeners();
initContextMenuListeners();
initCommandPaletteListeners();
initSettingsListeners();
initQuickCommandListeners();
initHomeListeners();
initPlaygroundListeners();
initFeatureMenuListeners();
initKeyboardShortcuts();
initSessionBeforeUnload();

/* ===========================
   MENU ACTIONS (IPC)
   =========================== */
window.termAPI.onMenuAction((action) => {
  switch (action) {
    case 'new-tab':          createTab(); break;
    case 'reopen-tab':       reopenLastClosedTab(); break;
    case 'close-pane':       if (getFocusedPaneId()) closePaneById(getFocusedPaneId()); break;
    case 'split-horizontal': if (getFocusedPaneId()) splitPane(getFocusedPaneId(), 'horizontal'); break;
    case 'split-vertical':   if (getFocusedPaneId()) splitPane(getFocusedPaneId(), 'vertical'); break;
    case 'toggle-search':    toggleSearch(); break;
    case 'zoom-in':          zoomIn(); break;
    case 'zoom-out':         zoomOut(); break;
    case 'zoom-reset':       zoomReset(); break;
    case 'command-palette':  toggleCommandPalette(); break;
    case 'toggle-broadcast': toggleBroadcast(); break;
    case 'new-folder':       createFolder(); break;
    case 'save-session':     window.termAPI.saveSession(buildSessionData()); import('./utils.js').then(u => u.showToast('Session saved', 'success')); break;
    case 'clear-terminal':   if (getActiveTabId()) clearTerminal(getActiveTabId()); break;
    case 'toggle-theme':     import('./theme.js').then(t => t.toggleTheme()); break;
    case 'toggle-side-panel': toggleSidePanel(); break;
    case 'open-playground':  togglePlayground(); break;
    case 'open-settings':    openSettings(); break;
  }
});

/* ===========================
   WINDOW EVENTS
   =========================== */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const tab = tabs.get(getActiveTabId());
    if (tab) fitAllGuarded(tab.paneTree);
  }, 150);
});

window.termAPI.onWindowFocus((focused) => {
  document.body.classList.toggle('window-blurred', !focused);
});

/* ===========================
   MASCOT SVG STAMPING
   =========================== */
function stampMascot() {
  const template = $('mascotTemplate');
  if (!template) return;
  document.querySelectorAll('.mascot-svg-slot').forEach(slot => {
    const clone = template.content.cloneNode(true);
    const svg = clone.querySelector('svg');
    if (svg) {
      const w = slot.dataset.width || '100';
      const h = slot.dataset.height || '100';
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
    }
    slot.appendChild(clone);
  });
}

/* ===========================
   BOOT
   =========================== */
updateStatus('Starting...');
applyTheme(getThemeName());
applyTabBarPosition();
applyUiScale();
renderQuickCommands();
initWelcome();
setupDragDrop();
stampMascot();

// Detect platform and add body class for Windows-specific CSS
window.termAPI.getPlatform().then((platform) => {
  if (platform === 'win32') document.body.classList.add('platform-win');
});

// Show [DEV] indicator in titlebar when running in dev mode
window.termAPI.isDev().then((dev) => {
  if (dev) {
    const titlebarText = $('titlebarText');
    if (titlebarText) {
      titlebarText.textContent = 'TerminalM [DEV]';
      titlebarText.style.color = '#f9e2af';
    }
  }
});

// Try to restore previous session; if none, show homepage
(async () => {
  const restored = await restoreSession();
  if (!restored && !getWelcomeShown()) {
    showHomePage();
  }
})();
