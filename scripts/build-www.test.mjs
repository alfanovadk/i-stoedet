import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = join(repoRoot, 'www');

test('build-www kopierer alle runtime-filer til www/', () => {
  execFileSync('node', ['scripts/build-www.mjs'], { cwd: repoRoot });
  for (const f of RUNTIME_FILES) {
    assert.ok(existsSync(join(wwwDir, f)), `mangler i www/: ${f}`);
  }
});

test('www/index.html er identisk med kilden', () => {
  execFileSync('node', ['scripts/build-www.mjs'], { cwd: repoRoot });
  assert.equal(
    readFileSync(join(wwwDir, 'index.html'), 'utf8'),
    readFileSync(join(repoRoot, 'index.html'), 'utf8'),
  );
});

after(() => rmSync(wwwDir, { recursive: true, force: true }));
