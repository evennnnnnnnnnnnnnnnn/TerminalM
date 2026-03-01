/* ============================================
   TerminalM — Playground (3D Virtual Office)
   ============================================ */
import {
  tabs,
  getPlayground3D, setPlayground3D,
  setPlaygroundDetailTabId,
} from './state.js';
import { $, escapeHtml } from './utils.js';
import { closeTab, switchTab, renderTabs } from './tabs.js';
import { scheduleSessionSave } from './session.js';

const PROCESS_NAMES = {
  claude: 'Claude AI', node: 'Node.js', git: 'Git', python: 'Python',
  docker: 'Docker', powershell: 'PowerShell', ssh: 'SSH', vim: 'Vim',
  build: 'Build', test: 'Test', database: 'Database', idle: 'Idle', unknown: 'Terminal',
};

export function _initPlayground3D(retries = 0) {
  const container = $('pgCanvasWrap');
  if (!container || getPlayground3D()) return;
  if (!window.Playground3D) {
    if (retries >= 50) {
      console.error('Playground3D module failed to load');
      return;
    }
    setTimeout(() => _initPlayground3D(retries + 1), 100);
    return;
  }
  const p3d = new window.Playground3D(container);
  setPlayground3D(p3d);
  p3d.onClick((tabId) => openPlaygroundInfo(tabId));
}

export function renderPlayground() {
  const pgEmpty = $('pgEmptyOverlay');
  const p3d = getPlayground3D();

  if (tabs.size === 0) {
    if (pgEmpty) pgEmpty.classList.remove('hidden');
    if (p3d) p3d.syncAgents(new Map());
    return;
  }

  if (pgEmpty) pgEmpty.classList.add('hidden');
  if (!p3d) _initPlayground3D();

  const current = getPlayground3D();
  if (current) current.syncAgents(tabs);
}

export function openPlaygroundInfo(tabId) {
  const tab = tabs.get(tabId);
  const panel = $('pgInfoPanel');
  if (!tab || !panel) return;

  setPlaygroundDetailTabId(tabId);
  panel.classList.add('open');

  const proc = tab.detectedProcess || 'idle';
  const name = PROCESS_NAMES[proc] || PROCESS_NAMES.unknown;

  const title = $('pgInfoTitle');
  const body = $('pgInfoBody');
  const actions = $('pgInfoActions');
  if (!title || !body || !actions) return;

  title.textContent = tab.label;
  body.innerHTML = `
    <div class="pg-info-row"><span class="pg-info-label">Process</span><span class="pg-info-value">${escapeHtml(name)}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Shell</span><span class="pg-info-value">${escapeHtml(tab.shellName || 'unknown')}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Directory</span><span class="pg-info-value" title="${escapeHtml(tab.cwd || '~')}">${escapeHtml(tab.cwd || '~')}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Status</span><span class="pg-info-value">${tab.locked ? 'Locked' : (proc !== 'idle' ? 'Working' : 'Idle')}</span></div>
    <div class="pg-info-row"><span class="pg-info-label">Color</span><span class="pg-info-value">${tab.color || 'none'}</span></div>
  `;

  actions.innerHTML = '';
  const switchBtn = document.createElement('button');
  switchBtn.className = 'pg-info-btn primary';
  switchBtn.textContent = 'Switch to Terminal';
  switchBtn.addEventListener('click', () => switchTab(tabId));
  actions.appendChild(switchBtn);

  const lockBtn = document.createElement('button');
  lockBtn.className = 'pg-info-btn';
  lockBtn.textContent = tab.locked ? 'Unlock' : 'Lock';
  lockBtn.addEventListener('click', () => {
    tab.locked = !tab.locked;
    renderTabs();
    scheduleSessionSave();
    renderPlayground();
    openPlaygroundInfo(tabId);
  });
  actions.appendChild(lockBtn);

  if (!tab.locked) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pg-info-btn danger';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      closeTab(tabId);
      panel.classList.remove('open');
      renderPlayground();
    });
    actions.appendChild(closeBtn);
  }

  const p3d = getPlayground3D();
  if (p3d) p3d.highlightAgent(tabId);
}

export function initPlaygroundListeners() {
  $('pgInfoClose')?.addEventListener('click', () => {
    const panel = $('pgInfoPanel');
    if (panel) panel.classList.remove('open');
    const p3d = getPlayground3D();
    if (p3d) p3d.clearHighlight();
  });
}
