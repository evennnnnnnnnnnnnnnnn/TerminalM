/* ============================================
   TerminalM — Keyboard Shortcuts
   ============================================ */
import { tabs, getActiveTabId } from './state.js';
import { cycleTab, reopenLastClosedTab, switchTab, clearTerminal } from './tabs.js';
import { focusNextPane } from './panes.js';
import { toggleCommandPalette } from './command-palette.js';
import { openSettings } from './settings.js';

export function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      toggleCommandPalette();
      return;
    }
    if (mod && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      reopenLastClosedTab();
      return;
    }
    if (mod && e.key === 'Tab') {
      e.preventDefault();
      cycleTab(e.shiftKey ? -1 : 1);
      return;
    }
    if (mod && e.key === 'l') {
      e.preventDefault();
      if (getActiveTabId()) clearTerminal(getActiveTabId());
      return;
    }
    if (mod && e.key === ',') {
      e.preventDefault();
      openSettings();
      return;
    }
    if (mod && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const i = parseInt(e.key) - 1;
      const ids = [...tabs.keys()];
      if (i < ids.length) switchTab(ids[i]);
    }
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      focusNextPane(1);
    }
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      focusNextPane(-1);
    }
  });
}
