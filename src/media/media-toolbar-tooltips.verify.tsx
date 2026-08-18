import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const toolbar = await readFile(new URL('./MediaPoolToolbar.tsx', import.meta.url), 'utf8');
const semantic = await readFile(new URL('./semantic-search/SemanticSearchControls.tsx', import.meta.url), 'utf8');

for (const label of ['uploadasset', 'sort', 'filter', '']) {
  assert.match(toolbar, new RegExp(`data-tip=\\{t\\('${label}'\\)\\}`), `mediatool“${label}”`);
}
assert.match(toolbar, /data-tip=\{t\(mediaViewToggleLabel\(props\.view\)\)\}/, '/columntablecurrent');
assert.match(semantic, /data-tip=\{t\('localsearch'\)\}/, 'localsearch');
assert.doesNotMatch(toolbar, /className=\{?`?[^\n]*cc-media-icon[^\n]*\stitle=/, 'mediatooldependencydelay title');
assert.doesNotMatch(semantic, /className=\{?`?[^\n]*cc-media-icon[^\n]*\stitle=/, 'searchdependencydelay title');

console.log('media toolbar immediate tooltips verified');
