/* Copy pdf.js worker file into public and export a relative URL for CRA */
const fs = require('fs');
const path = require('path');

function resolveWorker() {
  try {
    // pdfjs-dist v4 path
    return require.resolve('pdfjs-dist/build/pdf.worker.min.mjs');
  } catch (_) {
    try {
      // fallback (older versions)
      return require.resolve('pdfjs-dist/build/pdf.worker.min.js');
    } catch (__) {
      return null;
    }
  }
}

const workerPath = resolveWorker();
if (!workerPath) {
  console.warn('[copy-pdf-worker] pdf.worker file not found. PDF import may fail.');
  process.exit(0);
}

const destDir = path.join(process.cwd(), 'public');
const destFile = path.join(destDir, 'pdf.worker.min.mjs');
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(workerPath, destFile);
console.log('[copy-pdf-worker] Copied', workerPath, '->', destFile);
