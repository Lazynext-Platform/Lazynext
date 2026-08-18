import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../index.css', import.meta.url), 'utf8');

assert.match(css, /\.ln-resource-tertiary-tabs,\.ln-sound-chips \{ position:sticky; top:-10px; z-index:3; background:var\(--ln-panel\); \}/);
assert.match(css, /\.ln-template-category-tabs \{ margin-top:-10px; padding-top:10px; \}/);
assert.match(css, /\.ln-sound-chips \{[\s\S]*?margin-top:-10px; padding-top:10px;/);

console.log('template and sound category navigation stays visible while scrolling');
