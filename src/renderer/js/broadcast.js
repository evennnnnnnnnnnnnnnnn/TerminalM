/* ============================================
   TerminalM — Broadcast Mode
   ============================================ */
import { getBroadcastMode, setBroadcastMode } from './state.js';
import { $, updateStatus } from './utils.js';

export function toggleBroadcast() {
  const next = !getBroadcastMode();
  setBroadcastMode(next);
  const ind = $('broadcastIndicator');
  if (ind) ind.classList.toggle('active', next);
  document.body.classList.toggle('broadcast-active', next);
  updateStatus(next ? 'Broadcast ON \u2014 typing sends to all panes' : 'Ready');
}

export function initBroadcastListeners() {
  $('broadcastIndicator')?.addEventListener('click', toggleBroadcast);
}
