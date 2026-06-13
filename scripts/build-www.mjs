// Copies the canonical runtime files to www/ (Capacitor's webDir).
// Run before `npx cap sync ios`.
import { mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = join(repoRoot, 'www');

rmSync(wwwDir, { recursive: true, force: true });
mkdirSync(wwwDir, { recursive: true });
for (const f of RUNTIME_FILES) {
  copyFileSync(join(repoRoot, f), join(wwwDir, f));
}
console.log(`build-www: kopierede ${RUNTIME_FILES.length} filer → www/`);
