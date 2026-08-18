import assert from 'node:assert/strict';
import englishMedia from '../i18n/dict/en/media';
import { mediaViewToggleLabel, toggleMediaView } from './mediaView';

assert.equal(mediaViewToggleLabel('list'), 'Switch to grid view');
assert.equal(toggleMediaView('list'), 'grid');
assert.equal(mediaViewToggleLabel('grid'), 'Switch to list view');
assert.equal(toggleMediaView('grid'), 'list');
for (const view of ['grid', 'list'] as const) {
  const label = mediaViewToggleLabel(view);
  assert.ok(englishMedia[label], `English media dictionary must contain the view-toggle label: ${label}`);
}

console.log('media view toggle verification passed');
