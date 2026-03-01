/* ============================================
   TerminalM — Theme
   ============================================ */
import { panes } from './state.js';
import { $ } from './utils.js';

export const THEMES = {
  dark: {
    background:          '#1e1e2e',
    foreground:          '#cdd6f4',
    cursor:              '#f5e0dc',
    cursorAccent:        '#1e1e2e',
    selectionBackground: 'rgba(137,180,250,0.3)',
    selectionForeground: '#cdd6f4',
    black:   '#45475a', red:     '#f38ba8', green:   '#a6e3a1', yellow:  '#f9e2af',
    blue:    '#89b4fa', magenta: '#cba6f7', cyan:    '#94e2d5', white:   '#bac2de',
    brightBlack: '#585b70', brightRed:   '#f38ba8', brightGreen:   '#a6e3a1',
    brightYellow:'#f9e2af', brightBlue:  '#89b4fa', brightMagenta: '#cba6f7',
    brightCyan:  '#94e2d5', brightWhite: '#a6adc8',
  },
  light: {
    background:          '#eff1f5',
    foreground:          '#4c4f69',
    cursor:              '#dc8a78',
    cursorAccent:        '#eff1f5',
    selectionBackground: 'rgba(30,102,245,0.2)',
    selectionForeground: '#4c4f69',
    black:   '#5c5f77', red:     '#d20f39', green:   '#40a02b', yellow:  '#df8e1d',
    blue:    '#1e66f5', magenta: '#8839ef', cyan:    '#179299', white:   '#acb0be',
    brightBlack: '#6c6f85', brightRed:   '#d20f39', brightGreen:   '#40a02b',
    brightYellow:'#df8e1d', brightBlue:  '#1e66f5', brightMagenta: '#8839ef',
    brightCyan:  '#179299', brightWhite: '#bcc0cc',
  },
};

let currentTheme = localStorage.getItem('multi-terminal-theme') || 'dark';

export function getTheme() {
  return THEMES[currentTheme];
}

export function getThemeName() {
  return currentTheme;
}

export function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('multi-terminal-theme', theme);

  const THEME = THEMES[theme];
  for (const [, node] of panes) {
    if (node.terminal) {
      node.terminal.options.theme = THEME;
    }
  }

  const icon = $('themeIcon');
  if (icon) {
    if (theme === 'light') {
      icon.innerHTML = '<path d="M8 14A6 6 0 0 1 8 2a5 5 0 0 0 0 12z" fill="currentColor"/>';
    } else {
      icon.innerHTML = '<circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.3"/><path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>';
    }
  }

  window.termAPI.setTheme?.(theme);
}

export function toggleTheme() {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

export function initThemeListeners() {
  $('themeToggle')?.addEventListener('click', toggleTheme);
}
