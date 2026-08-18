import assert from 'node:assert/strict';
import { addAssetsToChat, allVisibleAssetsSelected, toggleVisibleAssetSelection } from './mediaSelectionActions';

const visible = ['map', 'route', 'video'];

assert.equal(allVisibleAssetsSelected(new Set(['map', 'route', 'video', 'outside']), visible), true,
  'currentvisibleassetall，emptyrightmenucancelall');
assert.deepEqual(
  [...toggleVisibleAssetSelection(new Set(['map', 'route', 'video', 'outside']), visible)].sort(),
  ['outside'],
  'cancelallcurrentvisibleasset，must notfolderfilterouterselect',
);
assert.deepEqual(
  [...toggleVisibleAssetSelection(new Set(['map', 'outside']), visible)].sort(),
  ['map', 'outside', 'route', 'video'],
  'allcurrentvisibleasset，select',
);

const selectedAssets = [{ id: 'map' }, { id: 'route' }, { id: 'video' }];
const chatCalls: Array<Array<{ id: string }>> = [];
addAssetsToChat(selectedAssets, (assets) => chatCalls.push(assets));
assert.equal(chatCalls.length, 1, 'batchadd AI dialogmust callback');
assert.deepEqual(chatCalls[0]?.map((asset) => asset.id), ['map', 'route', 'video'],
  'chat seed mustallassetselect');

console.log('media selection actions verification passed');
