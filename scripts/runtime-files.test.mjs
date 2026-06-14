import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { APP_DIR, RUNTIME_FILES } from './runtime-files.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('RUNTIME_FILES indeholder de 13 filer', () => {
  assert.equal(RUNTIME_FILES.length, 13);
});

test('alle runtime-filer findes i src/app/', () => {
  for (const f of RUNTIME_FILES) {
    assert.ok(existsSync(join(repoRoot, APP_DIR, f)), `mangler: ${f}`);
  }
});
