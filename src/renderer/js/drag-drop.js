/* ============================================
   TerminalM — Drag & Drop (external paths)
   ============================================ */
import { createTab } from './tabs.js';

export function setupDragDrop() {
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      document.body.classList.add('drop-active');
    }
  });

  document.addEventListener('dragleave', (e) => {
    if (!e.relatedTarget || !document.body.contains(e.relatedTarget)) {
      document.body.classList.remove('drop-active');
    }
  });

  document.addEventListener('drop', async (e) => {
    e.preventDefault();
    document.body.classList.remove('drop-active');

    if (!e.dataTransfer.types.includes('Files')) return;
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      const filePath = window.termAPI.getFilePath
        ? window.termAPI.getFilePath(file)
        : file.path;
      if (!filePath) continue;

      const result = await window.termAPI.resolvePath(filePath);
      if (result) {
        createTab(null, { cwd: result.dir, label: result.name });
      }
    }
  });
}
