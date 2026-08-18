import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./TemplateBrowser.tsx', import.meta.url), 'utf8');

assert.match(source, /onContextMenu=\{\(event\) =>/);
assert.match(source, /aria-label=\{t\('Add to timeline: \{name\}', \{ name: template\.name \}\)/);
assert.match(source, /<Icon name="plus"/);
assert.doesNotMatch(source, /className="ln-template-add"\s+onClick=/);
assert.match(source, /title=\{t\('Add to timeline: \{name\}', \{ name: template\.name \}\)\}/, 'the visible menu button should remain keyboard accessible');

console.log('template-card-actions.verify: template cards separate drag, add, and management actions');
