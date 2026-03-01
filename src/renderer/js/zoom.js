/* ============================================
   TerminalM — Zoom
   ============================================ */
import { panes, getFontSize, setFontSize } from './state.js';

export function applyFontSize() {
  const fs = getFontSize();
  for (const [, node] of panes) {
    if (node.terminal) {
      node.terminal.options.fontSize = fs;
      try { node.fitAddon.fit(); } catch {}
    }
  }
}

export function zoomIn() {
  setFontSize(Math.min(getFontSize() + 1, 28));
  applyFontSize();
}

export function zoomOut() {
  setFontSize(Math.max(getFontSize() - 1, 8));
  applyFontSize();
}

export function zoomReset() {
  setFontSize(13);
  applyFontSize();
}
