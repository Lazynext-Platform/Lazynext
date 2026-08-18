import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exportHistory = await readFile(new URL('./ExportHistory.tsx', import.meta.url), 'utf8');

assert.match(
  exportHistory,
  /<TopBarIconButton[\s\S]*?icon="download"[\s\S]*?label=\{t\('Export History'\)\}/,
  'export history button uses TopBarIconButton with label',
);
assert.doesNotMatch(
  exportHistory,
  /<button title=\{t\('Export History'\)\}/,
  'export history button does not use title attribute',
);

console.log('top bar immediate tooltips verified');
