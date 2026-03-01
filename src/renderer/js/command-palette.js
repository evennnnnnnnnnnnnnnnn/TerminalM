/* ============================================
   TerminalM — Command Palette
   ============================================ */
import {
  panes,
  getFocusedPaneId,
  getPaletteVisible, setPaletteVisible,
  getPaletteIdx, setPaletteIdx,
  getCommands, setCommands,
} from './state.js';
import { $, escapeHtml } from './utils.js';

/* Lazy FEATURE_ITEMS import — set from feature-menu.js */
let _getFeatureItems = null;
export function setFeatureItemsGetter(fn) { _getFeatureItems = fn; }

function ensureCommands() {
  if (!getCommands() && _getFeatureItems) {
    const items = _getFeatureItems().filter(i => !i.sep);
    // Add extras
    import('./tabs.js').then(({ closeTab }) => {
      // noop — commands already built synchronously below
    });
    setCommands(items.concat([
      {
        label: 'Close Tab',
        hint: 'Ctrl+W',
        action: () => {
          import('./tabs.js').then(({ closeTab }) => {
            import('./state.js').then(({ getActiveTabId }) => {
              const id = getActiveTabId();
              if (id) closeTab(id);
            });
          });
        },
      },
    ]));
  }
  return getCommands() || [];
}

export function toggleCommandPalette() {
  const next = !getPaletteVisible();
  setPaletteVisible(next);
  const palette = $('commandPalette');
  const backdrop = $('commandPaletteBackdrop');
  const input = $('commandPaletteInput');
  if (palette) palette.classList.toggle('visible', next);
  if (backdrop) backdrop.classList.toggle('visible', next);
  if (next) {
    if (input) {
      input.value = '';
      input.placeholder = 'Type a command...';
    }
    setCommands(null);
    setPaletteIdx(0);
    renderCmdList('');
    if (input) input.focus();
  } else {
    setCommands(null);
    if (input) input.placeholder = 'Type a command...';
    const n = panes.get(getFocusedPaneId());
    if (n?.terminal) n.terminal.focus();
  }
}

export function renderCmdList(filter) {
  const cmdList = $('commandPaletteList');
  if (!cmdList) return [];
  const f = filter.toLowerCase();
  const commands = ensureCommands();
  const filtered = commands.filter(c => c.label.toLowerCase().includes(f));
  cmdList.innerHTML = '';
  const idx = Math.min(getPaletteIdx(), Math.max(0, filtered.length - 1));
  setPaletteIdx(idx);
  filtered.forEach((cmd, i) => {
    const el = document.createElement('div');
    el.className = `command-palette-item${i === idx ? ' selected' : ''}`;
    el.innerHTML = `<span>${escapeHtml(cmd.label)}</span>${cmd.hint ? `<span class="command-hint">${escapeHtml(cmd.hint)}</span>` : ''}`;
    el.addEventListener('click', () => {
      cmd.action();
      toggleCommandPalette();
    });
    el.addEventListener('mouseenter', () => {
      setPaletteIdx(i);
      cmdList.querySelectorAll('.command-palette-item').forEach((e, j) => {
        e.classList.toggle('selected', j === i);
      });
    });
    cmdList.appendChild(el);
  });
  return filtered;
}

export function initCommandPaletteListeners() {
  const input = $('commandPaletteInput');
  const cmdList = $('commandPaletteList');
  const backdrop = $('commandPaletteBackdrop');

  input?.addEventListener('input', () => {
    setPaletteIdx(0);
    renderCmdList(input.value);
  });

  input?.addEventListener('keydown', (e) => {
    const items = cmdList?.querySelectorAll('.command-palette-item') || [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteIdx(Math.min(getPaletteIdx() + 1, items.length - 1));
      items.forEach((el, i) => el.classList.toggle('selected', i === getPaletteIdx()));
      items[getPaletteIdx()]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteIdx(Math.max(getPaletteIdx() - 1, 0));
      items.forEach((el, i) => el.classList.toggle('selected', i === getPaletteIdx()));
      items[getPaletteIdx()]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const commands = ensureCommands();
      const fil = commands.filter(c => c.label.toLowerCase().includes(input.value.toLowerCase()));
      if (fil[getPaletteIdx()]) {
        fil[getPaletteIdx()].action();
        toggleCommandPalette();
      }
    } else if (e.key === 'Escape') {
      toggleCommandPalette();
    }
  });

  backdrop?.addEventListener('click', () => {
    if (getPaletteVisible()) toggleCommandPalette();
  });
}
