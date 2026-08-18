// Runnable: `npx tsx src/media/media-folder-menu.verify.ts`
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const card = readFileSync(new URL('./MediaPoolCard.tsx', import.meta.url), 'utf8');
const overlays = readFileSync(new URL('./MediaPoolOverlays.tsx', import.meta.url), 'utf8');
const panel = readFileSync(new URL('./MediaPoolPanel.tsx', import.meta.url), 'utf8');
const menus = readFileSync(new URL('./MediaPoolMenus.tsx', import.meta.url), 'utf8');
const grid = readFileSync(new URL('./MediaPoolGrid.tsx', import.meta.url), 'utf8');

assert.match(card, /onContextMenu/, 'ok');
assert.match(card, /onOpenMenu/, 'ok');
assert.match(card, /cc-folder-more/, ' ⋯ ');
assert.match(overlays, /export function FolderMenuPortal/, ' portal');
assert.match(overlays, /FolderMenuPortal/, 'ok');
assert.match(menus, /FolderMenuPortal/, 'domain-local media menus must mount the folder portal');
assert.match(panel, /MediaPoolMenus/, 'ok');
assert.match(panel, /onOpenFolderMenu/, 'ok');
assert.match(grid, /onOpenFolderMenu/, 'ok');
assert.match(panel, /currentFolderId === state\.id/, 'ok');

console.log('media-folder-menu.verify: ok (/⋯/portal)');
