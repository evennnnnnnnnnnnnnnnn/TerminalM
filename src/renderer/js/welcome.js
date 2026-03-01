/* ============================================
   TerminalM — Welcome Overlay
   ============================================ */
import {
  tabs,
  getWelcomeShown, setWelcomeShown,
  getMascotInterval, setMascotInterval,
} from './state.js';
import { $ } from './utils.js';

// createTab is imported lazily to avoid circular dependency
let _createTab = null;
export function setCreateTab(fn) { _createTab = fn; }

export function initWelcome() {
  const overlay = $('welcomeOverlay');
  if (!overlay) return;
  if (localStorage.getItem('multi-terminal-welcomed')) {
    overlay.style.display = 'none';
    return;
  }
  setWelcomeShown(true);
  overlay.classList.add('visible');

  const tips = document.querySelectorAll('.welcome-tip');
  const speech = $('welcomeSpeech');
  const messages = [
    'Welcome to TerminalM!',
    'Create tabs with Ctrl+T',
    'Split panes to multitask!',
    'Try the command palette!',
  ];
  let idx = 0;

  const interval = setInterval(() => {
    idx = (idx + 1) % messages.length;
    if (speech) {
      speech.style.opacity = '0';
      setTimeout(() => {
        speech.textContent = messages[idx];
        speech.style.opacity = '1';
      }, 300);
    }
    tips.forEach((t, i) => t.classList.toggle('active', i === idx));
  }, 3000);
  setMascotInterval(interval);
}

export function dismissWelcome() {
  if (!getWelcomeShown()) return;
  setWelcomeShown(false);
  const overlay = $('welcomeOverlay');
  if (overlay) overlay.classList.remove('visible');
  localStorage.setItem('multi-terminal-welcomed', 'true');
  const interval = getMascotInterval();
  if (interval) clearInterval(interval);
  setTimeout(() => {
    if (overlay) overlay.style.display = 'none';
  }, 400);
}

export function initWelcomeListeners() {
  $('welcomeStartBtn')?.addEventListener('click', () => {
    dismissWelcome();
    if (tabs.size === 0 && _createTab) _createTab();
  });
}
