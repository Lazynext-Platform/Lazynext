import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exportHistory = await readFile(new URL('./ExportHistory.tsx', import.meta.url), 'utf8');

assert.match(
  exportHistory,
  /<TopBarIconButton[\s\S]*?icon="download"[\s\S]*?label=\{t\('exporthistory'\)\}/,
  'exporthistorybuttonbutton',
);
assert.doesNotMatch(
  exportHistory,
  /<button title=\{t\('exporthistory'\)\}/,
  'exporthistorybuttonstyle title',
);

console.log('top bar immediate tooltips verified');
