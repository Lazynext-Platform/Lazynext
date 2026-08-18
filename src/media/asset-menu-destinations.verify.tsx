import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const testLocaleId = '\0asset-menu-destinations-test-locale';
const vite = await createServer({
 appType: 'custom',
 plugins: [{
 name: 'asset-menu-destinations-test-locale',
 enforce: 'pre',
 resolveId(id) {
 return id.endsWith('/i18n/locale') || id.endsWith('/i18n/locale.ts') ? testLocaleId : null;
 },
 load(id) {
 if (id !== testLocaleId) return null;
 return `
 export const t = (text, params) => params
 ? text.replace(/\\{(\\w+)\\}/g, (match, key) => key in params ? String(params[key]) : match)
 : text;
 export const useT = () => t;
 `;
 },
 }],
 server: { middlewareMode: true },
});

try {
 const { AssetMenuDestinations } = await vite.ssrLoadModule(
 '/src/media/AssetMenuDestinations.tsx',
 ) as typeof import('./AssetMenuDestinations');
 const { BlankMediaMenuActions } = await vite.ssrLoadModule(
 '/src/media/MediaPoolOverlays.tsx',
 ) as typeof import('./MediaPoolOverlays');
 const { runAssetDestinationAction } = await vite.ssrLoadModule(
 '/src/media/assetDestination.ts',
 ) as typeof import('./assetDestination');
 const { assetMenuSelectionIds, assetMenuFavoriteValue, batchAssetRename, duplicateAssetName } = await vite.ssrLoadModule(
 '/src/media/assetMenuSelection.ts',
 ) as typeof import('./assetMenuSelection');

 const calls: string[] = [];
 const actions = {
 timeline: () => calls.push('timeline'),
 chat: () => calls.push('chat'),
 };

 runAssetDestinationAction('timeline', actions);
 runAssetDestinationAction('chat', actions);
 assert.deepEqual(calls, ['timeline', 'chat']);
 assert.deepEqual(
 assetMenuSelectionIds('asset-b', new Set(['asset-a', 'asset-b']), ['asset-a', 'asset-b', 'asset-c']),
 ['asset-a', 'asset-b'],
 '',
 );
 assert.equal(duplicateAssetName('video.mp4', 'copy'), 'video copy.mp4');
 assert.equal(duplicateAssetName('', 'copy'), ' copy');
 assert.deepEqual(
 assetMenuSelectionIds('asset-c', new Set(['asset-a', 'asset-b']), ['asset-a', 'asset-b', 'asset-c']),
 ['asset-c'],
 '',
 );
 assert.equal(
 assetMenuFavoriteValue([{ favorite: true }, { favorite: false }]),
 true,
 '',
 );
 assert.equal(
 assetMenuFavoriteValue([{ favorite: true }, { favorite: true }]),
 false,
 '',
 );
 assert.deepEqual(
 batchAssetRename([
 { id: 'asset-a', name: 'clip.mp4' },
 { id: 'asset-b', name: 'image.png' },
 ], 'ok'),
 [
 { id: 'asset-a', name: 'ok.mp4' },
 { id: 'asset-b', name: 'ok 2.png' },
 ],
 '',
 );

 const markup = renderToStaticMarkup(createElement(AssetMenuDestinations, {
 assetName: '77.mp4',
 onAddTimeline: () => undefined,
 onAddChat: () => undefined,
 }));

 assert.match(markup, /menu/, 'ok');
 assert.match(markup, /></);
 assert.match(markup, />AI chat</);
 assert.ok(markup.indexOf('>AI chat<') < markup.indexOf('>Timeline<'), 'AI chat before Timeline');
 assert.match(markup, /aria-label="Add 77.mp4 to AI chat"/);
 assert.match(markup, /aria-label="Add 77.mp4 to timeline"/);

 const blankMenuMarkup = renderToStaticMarkup(createElement(BlankMediaMenuActions, {
 clipboardCount: 2,
 visibleCount: 3,
 allVisibleSelected: false,
 view: 'grid',
 sort: 'newest',
 type: 'all',
 onPaste: () => undefined,
 onSelectAll: () => undefined,
 onUpload: () => undefined,
 onSemanticSearch: () => undefined,
 onMobileUpload: () => undefined,
 onCreateFolder: () => undefined,
 onViewToggle: () => undefined,
 onSort: () => undefined,
 onType: () => undefined,
 }));
 assert.match(blankMenuMarkup, / \(2\)/);
 assert.match(blankMenuMarkup, /></);
 assert.match(blankMenuMarkup, /></);
 assert.match(blankMenuMarkup, /></);
 assert.match(blankMenuMarkup, /></);
 assert.match(blankMenuMarkup, /></);
 assert.match(blankMenuMarkup, /aria-label="Sort media"/);
 assert.match(blankMenuMarkup, /aria-label="Filter media"/);

 const overlaySource = await readFile(new URL('./MediaPoolOverlays.tsx', import.meta.url), 'utf8');
 assert.doesNotMatch(overlaySource, /className="cc-asset-menu-backdrop"/, 'ok');
 assert.match(overlaySource, /document\.addEventListener\('pointerdown', closeOutside, true\)/, 'ok');
} finally {
 await vite.close();
}

console.log('asset menu destinations verified');
