import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const toolbar = await readFile(new URL('./MediaPoolToolbar.tsx', import.meta.url), 'utf8');
const semantic = await readFile(new URL('./semantic-search/SemanticSearchControls.tsx', import.meta.url), 'utf8');

for (const label of ['Upload media', 'Sort', 'Filter', 'More actions']) {
  assert.match(toolbar, new RegExp(`data-tip=\\{t\\('${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\)\\}`), `media tool “${label}”`);
}
assert.match(toolbar, /data-tip=\{t\(mediaViewToggleLabel\(props\.view\)\)\}/, 'view toggle tooltip');
assert.match(semantic, /data-tip=\{t\('Local semantic search'\)\}/, 'local search');
assert.doesNotMatch(toolbar, /className=\{?`?[^\n]*ln-media-icon[^\n]*\stitle=/, 'mediatooldependencydelay title');
assert.doesNotMatch(semantic, /className=\{?`?[^\n]*ln-media-icon[^\n]*\stitle=/, 'searchdependencydelay title');

console.log('media toolbar immediate tooltips verified');
