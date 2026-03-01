/* ============================================
   TerminalM — Quick Commands Side Panel
   ============================================ */
import {
  tabs,
  getActiveTabId, getFocusedPaneId,
  getQuickCommands, setQuickCommands,
  getQuickCmdEditId, setQuickCmdEditId,
} from './state.js';
import { $, escapeHtml } from './utils.js';
import { createTab } from './tabs.js';
import { fitAllGuarded } from './panes.js';

function saveQuickCommands() {
  localStorage.setItem('multi-terminal-quick-cmds', JSON.stringify(getQuickCommands()));
}

export function toggleSidePanel() {
  const panel = $('sidePanel');
  if (panel) panel.classList.toggle('open');
  const btn = $('quickCmdBtn');
  if (btn) btn.classList.toggle('active', panel?.classList.contains('open'));
  setTimeout(() => {
    const tab = tabs.get(getActiveTabId());
    if (tab) fitAllGuarded(tab.paneTree);
  }, 250);
}

export function renderQuickCommands() {
  const list = $('quickCmdList');
  if (!list) return;
  const empty = $('quickCmdEmpty');
  list.querySelectorAll('.quick-cmd').forEach(el => el.remove());

  const cmds = getQuickCommands();
  if (cmds.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  for (const cmd of cmds) {
    const el = document.createElement('div');
    el.className = 'quick-cmd';
    el.innerHTML = `
      <div class="quick-cmd-body" title="Click to run: ${escapeHtml(cmd.command)}">
        <div class="quick-cmd-name">${escapeHtml(cmd.name)}</div>
        <div class="quick-cmd-preview">${escapeHtml(cmd.command)}</div>
      </div>
      <div class="quick-cmd-actions">
        <button class="quick-cmd-action edit" title="Edit">&#9998;</button>
        <button class="quick-cmd-action delete" title="Delete">&times;</button>
      </div>
    `;

    el.querySelector('.quick-cmd-body').addEventListener('click', () => runQuickCommand(cmd));
    el.querySelector('.edit').addEventListener('click', () => openQuickCmdDialog(cmd));
    el.querySelector('.delete').addEventListener('click', () => {
      setQuickCommands(getQuickCommands().filter(c => c.id !== cmd.id));
      saveQuickCommands();
      renderQuickCommands();
    });

    list.appendChild(el);
  }
}

function runQuickCommand(cmd) {
  if (!getActiveTabId() || !getFocusedPaneId()) {
    createTab();
    setTimeout(() => sendCommandToFocusedPane(cmd.command), 500);
  } else {
    sendCommandToFocusedPane(cmd.command);
  }
}

function sendCommandToFocusedPane(command) {
  const paneId = getFocusedPaneId();
  if (!paneId) return;
  window.termAPI.writePty(paneId, command + '\r');
}

function openQuickCmdDialog(cmd) {
  const nameInput = $('quickCmdName');
  const commandInput = $('quickCmdCommand');
  const title = $('quickCmdDialogTitle');
  const dialog = $('quickCmdDialog');
  const backdrop = $('quickCmdBackdrop');

  if (cmd) {
    setQuickCmdEditId(cmd.id);
    if (nameInput) nameInput.value = cmd.name;
    if (commandInput) commandInput.value = cmd.command;
    if (title) title.textContent = 'Edit Quick Command';
  } else {
    setQuickCmdEditId(null);
    if (nameInput) nameInput.value = '';
    if (commandInput) commandInput.value = '';
    if (title) title.textContent = 'Add Quick Command';
  }

  if (dialog) dialog.classList.add('visible');
  if (backdrop) backdrop.classList.add('visible');
  if (nameInput) nameInput.focus();
}

function closeQuickCmdDialog() {
  const dialog = $('quickCmdDialog');
  const backdrop = $('quickCmdBackdrop');
  if (dialog) dialog.classList.remove('visible');
  if (backdrop) backdrop.classList.remove('visible');
}

function saveQuickCmdFromDialog() {
  const name = $('quickCmdName')?.value.trim();
  const command = $('quickCmdCommand')?.value.trim();
  if (!name || !command) return;

  const cmds = getQuickCommands();
  const editId = getQuickCmdEditId();
  if (editId) {
    const existing = cmds.find(c => c.id === editId);
    if (existing) {
      existing.name = name;
      existing.command = command;
    }
  } else {
    cmds.push({ id: 'qcmd-' + Date.now(), name, command });
  }

  saveQuickCommands();
  renderQuickCommands();
  closeQuickCmdDialog();
}

export function initQuickCommandListeners() {
  $('sidePanelClose')?.addEventListener('click', toggleSidePanel);
  $('quickCmdBtn')?.addEventListener('click', toggleSidePanel);
  $('quickCmdBtn')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSidePanel(); }
  });
  $('addQuickCmd')?.addEventListener('click', () => openQuickCmdDialog(null));
  $('quickCmdCancel')?.addEventListener('click', closeQuickCmdDialog);
  $('quickCmdSave')?.addEventListener('click', saveQuickCmdFromDialog);
  $('quickCmdBackdrop')?.addEventListener('click', closeQuickCmdDialog);

  $('quickCmdName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('quickCmdCommand')?.focus(); }
    if (e.key === 'Escape') closeQuickCmdDialog();
  });
  $('quickCmdCommand')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); saveQuickCmdFromDialog(); }
    if (e.key === 'Escape') closeQuickCmdDialog();
  });
}
