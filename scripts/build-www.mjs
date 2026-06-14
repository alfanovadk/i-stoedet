// Copies the canonical runtime files from src/app/ to www/ (Capacitor's webDir).
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { APP_DIR, RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = join(repoRoot, 'www');
const srcDir = join(repoRoot, APP_DIR);

rmSync(wwwDir, { recursive: true, force: true });
mkdirSync(wwwDir, { recursive: true });
for (const f of RUNTIME_FILES) {
  copyFileSync(join(srcDir, f), join(wwwDir, f));
}
console.log(`build-www: kopierede ${RUNTIME_FILES.length} filer fra ${APP_DIR}/ → www/`);
