/* ============================================
   TerminalM — Utility Helpers
   ============================================ */

export const $ = (id) => document.getElementById(id);

export function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function updateStatus(text) {
  const el = $('statusText');
  if (el) el.textContent = text;
}

export function announce(text) {
  const el = $('liveRegion');
  if (el) {
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = text; });
  }
}

/* ---- Toast notifications ---- */
const TOAST_ICONS = {
  info: '\u2139\uFE0F',
  success: '\u2705',
  warning: '\u26A0\uFE0F',
  error: '\u274C',
};

function dismissToast(toast) {
  if (toast._dismissed) return;
  toast._dismissed = true;
  clearTimeout(toast._timer);
  toast.classList.add('toast-out');
  toast.addEventListener('animationend', () => { toast.remove(); }, { once: true });
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span><span>${escapeHtml(message)}</span>`;
  toast.addEventListener('click', () => dismissToast(toast));
  container.appendChild(toast);
  const timer = setTimeout(() => dismissToast(toast), duration);
  toast._timer = timer;
  const toasts = container.querySelectorAll('.toast:not(.toast-out)');
  if (toasts.length > 5) dismissToast(toasts[0]);
}

export function countPanes(node) {
  if (!node) return 0;
  if (node.type === 'pane') return 1;
  return node.children.reduce((s, c) => s + countPanes(c), 0);
}
