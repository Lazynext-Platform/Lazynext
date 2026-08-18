import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AddSolidCanvasCard } from './AddSolidCanvasCard';

const markup = renderToStaticMarkup(
 <AddSolidCanvasCard label="addbackground/" onAdd={() => undefined} />,
);

assert.match(
 markup,
 /class="cc-add-solid-canvas-card"/,
 'assetshould provideaddbackground/',
);
assert.match(markup, /addbackground\//, 'name');
assert.match(markup, /aria-label="addbackground\/"/, 'add');

console.log('add-solid-canvas-card.verify: first-grid action card OK');
