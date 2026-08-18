import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(new URL('./MediaPoolPanel.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./MediaPoolGrid.tsx', import.meta.url), 'utf8');
const card = readFileSync(new URL('./MediaPoolCard.tsx', import.meta.url), 'utf8');

assert.match(panel, /setFavoritesOnly\(true\)/, 'mustview');
assert.match(panel, /favoritesOnly \? ` \/ \$\{t\('Favorites'\)\}`/, 'viewmustpackage');
assert.match(grid, /kind: 'favorites'/, 'assetmustcontaintype');
assert.match(grid, /ln-folder-card ln-favorites-folder/, 'mustfolder');
assert.match(card, /className="ln-asset-favorite"/, 'assetmustbutton');
assert.match(card, /aria-pressed=\{!!asset\.favorite\}/, 'buttonmustcurrentstate');
assert.match(card, /onSetFavorite\(asset\.id, !asset\.favorite\)/, 'buttonmustasset favorite');
assert.doesNotMatch(card, /ln-asset-check/, 'select');

console.log('media-favorites-folder.verify: folder and card favorite controls are wired');
