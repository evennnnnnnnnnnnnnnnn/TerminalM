/* ============================================
   TerminalM — Search
   ============================================ */
import { panes, getFocusedPaneId, getSearchVisible, setSearchVisible } from './state.js';
import { $ } from './utils.js';

const SEARCH_OPTS = {
  regex: false,
  caseSensitive: false,
  incremental: true,
  decorations: {
    matchBackground: '#f9e2af44',
    matchBorder: '#f9e2af',
    matchOverviewRuler: '#f9e2af',
    activeMatchBackground: '#f9e2afaa',
    activeMatchBorder: '#f9e2af',
    activeMatchColorOverviewRuler: '#fab387',
  },
};

export function toggleSearch() {
  const visible = !getSearchVisible();
  setSearchVisible(visible);
  const overlay = $('searchOverlay');
  const input = $('searchInput');
  if (overlay) overlay.classList.toggle('visible', visible);
  if (visible) {
    if (input) { input.focus(); input.select(); }
  } else {
    if (input) input.value = '';
    const n = panes.get(getFocusedPaneId());
    if (n?.searchAddon) n.searchAddon.clearDecorations();
    if (n?.terminal) n.terminal.focus();
  }
}

export function doSearch(dir) {
  const input = $('searchInput');
  const q = input?.value;
  if (!q) return;
  const n = panes.get(getFocusedPaneId());
  if (!n?.searchAddon) return;
  if (dir === 'next') n.searchAddon.findNext(q, SEARCH_OPTS);
  else n.searchAddon.findPrevious(q, SEARCH_OPTS);
}

export function initSearchListeners() {
  const input = $('searchInput');
  input?.addEventListener('input', () => doSearch('next'));
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doSearch(e.shiftKey ? 'prev' : 'next');
    }
    if (e.key === 'Escape') toggleSearch();
  });
  $('searchPrev')?.addEventListener('click', () => doSearch('prev'));
  $('searchNext')?.addEventListener('click', () => doSearch('next'));
  $('searchClose')?.addEventListener('click', () => toggleSearch());
}
