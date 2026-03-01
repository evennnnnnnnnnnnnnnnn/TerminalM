/* ============================================
   TerminalM — Settings Panel
   ============================================ */
import {
  tabs, panes, tabDomCache,
  getActiveTabId,
  getSettings,
} from './state.js';
import { $, showToast } from './utils.js';
import { fitAll, invalidateTabDomCache, renderTerminalArea } from './panes.js';

function saveSettings() {
  localStorage.setItem('multi-terminal-settings', JSON.stringify(getSettings()));
}

export function applyUiScale() {
  const settings = getSettings();
  const scale = settings.uiScale || 1;
  const root = document.documentElement;
  root.style.setProperty('--titlebar-h', `${Math.round(46 * scale)}px`);
  root.style.setProperty('--tabbar-h', `${Math.round(36 * scale)}px`);
  root.style.setProperty('--statusbar-h', `${Math.round(24 * scale)}px`);
  root.style.setProperty('--ui-scale', String(scale));
  setTimeout(() => {
    const tab = tabs.get(getActiveTabId());
    if (tab) fitAll(tab.paneTree);
  }, 150);
}

export function applyTabBarPosition() {
  const settings = getSettings();
  document.body.classList.toggle('vertical-nav', settings.tabBarPosition === 'left');
  for (const tabId of tabDomCache.keys()) {
    invalidateTabDomCache(tabId);
  }
  setTimeout(() => {
    const tab = tabs.get(getActiveTabId());
    if (tab) {
      renderTerminalArea();
      fitAll(tab.paneTree);
    }
  }, 100);
}

export function openSettings() {
  const panel = $('settingsPanel');
  const backdrop = $('settingsBackdrop');
  if (!panel) return;
  const settings = getSettings();

  const fontSel = $('settingFontFamily');
  if (fontSel) {
    for (const opt of fontSel.options) {
      if (opt.value === settings.fontFamily) { opt.selected = true; break; }
    }
  }
  const cursorSel = $('settingCursorStyle');
  if (cursorSel) cursorSel.value = settings.cursorStyle;
  const cursorBlinkSel = $('settingCursorBlink');
  if (cursorBlinkSel) cursorBlinkSel.value = String(settings.cursorBlink);
  const scrollbackInp = $('settingScrollback');
  if (scrollbackInp) scrollbackInp.value = settings.scrollback;
  const autoRenameSel = $('settingAutoRename');
  if (autoRenameSel) autoRenameSel.value = String(settings.autoRename);
  const tabBarPosSel = $('settingTabBarPosition');
  if (tabBarPosSel) tabBarPosSel.value = settings.tabBarPosition || 'top';
  const uiScaleSel = $('settingUiScale');
  if (uiScaleSel) uiScaleSel.value = String(settings.uiScale || 1);

  panel.classList.add('visible');
  if (backdrop) backdrop.classList.add('visible');
}

export function closeSettings() {
  const panel = $('settingsPanel');
  const backdrop = $('settingsBackdrop');
  if (panel) panel.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('visible');
}

function applySettingsFromPanel() {
  const settings = getSettings();
  const fontSel = $('settingFontFamily');
  const cursorSel = $('settingCursorStyle');
  const cursorBlinkSel = $('settingCursorBlink');
  const scrollbackInp = $('settingScrollback');
  const autoRenameSel = $('settingAutoRename');
  const tabBarPosSel = $('settingTabBarPosition');
  const uiScaleSel = $('settingUiScale');

  if (fontSel) settings.fontFamily = fontSel.value;
  if (cursorSel) settings.cursorStyle = cursorSel.value;
  if (cursorBlinkSel) settings.cursorBlink = cursorBlinkSel.value === 'true';
  if (scrollbackInp) settings.scrollback = Math.max(100, Math.min(100000, parseInt(scrollbackInp.value) || 10000));
  if (autoRenameSel) settings.autoRename = autoRenameSel.value === 'true';
  if (tabBarPosSel) {
    settings.tabBarPosition = tabBarPosSel.value;
    applyTabBarPosition();
  }
  if (uiScaleSel) {
    settings.uiScale = parseFloat(uiScaleSel.value) || 1;
    applyUiScale();
  }

  saveSettings();

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

export function initSettingsListeners() {
  $('settingsClose')?.addEventListener('click', closeSettings);
  $('settingsBackdrop')?.addEventListener('click', closeSettings);

  ['settingFontFamily', 'settingCursorStyle', 'settingCursorBlink', 'settingScrollback', 'settingAutoRename', 'settingTabBarPosition', 'settingUiScale'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', applySettingsFromPanel);
  });
}
