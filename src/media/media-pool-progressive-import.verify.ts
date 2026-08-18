import assert from 'node:assert/strict';
import type { MediaAsset } from '../editor/types';
import { MediaImportCancelledError } from './mediaImportConflict';
import { importMediaBatch } from './mediaPoolImport';

const failedProbe = new Error('unsupported media type');
const starts: string[] = [];
const successful = { id: 'good', name: 'good.mov' } as MediaAsset;
const firstBatchErrors = await importMediaBatch({
  files: [{ name: 'bad.txt' } as File, { name: 'good.mov' } as File],
  targetFolderId: 'folder-a',
  onImport: async (file, _onProgress, lifecycle) => {
    starts.push(file.name);
    if (file.name === 'bad.txt') throw failedProbe;
    lifecycle?.onPlaceholder?.(successful);
    return successful;
  },
  onMoveAssets: () => undefined,
  onProgress: () => undefined,
});

assert.deepEqual(starts, ['bad.txt', 'good.mov'], 'file placeholder frontfailbackimportbackfile');
assert.deepEqual(firstBatchErrors, [failedProbe], 'backactualimportfail');

const conflictStarts: string[] = [];
const conflictPlacements: string[] = [];
const overwritten = { id: 'overwrite', name: 'same-name.mov' } as MediaAsset;
const conflictErrors = await importMediaBatch({
  files: [{ name: 'cancel.mov' } as File, { name: 'same-name.mov' } as File],
  targetFolderId: 'folder-b',
  onImport: async (file) => {
    conflictStarts.push(file.name);
    if (file.name === 'cancel.mov') throw new MediaImportCancelledError();
    return overwritten;
  },
  onMoveAssets: (ids, folderId) => conflictPlacements.push(`${ids[0]}:${folderId}`),
  onProgress: () => undefined,
});

assert.deepEqual(conflictStarts, ['cancel.mov', 'same-name.mov'], 'none placeholder cancelmust notbackimport');
assert.deepEqual(conflictErrors, [], 'usercancelfail');
assert.deepEqual(conflictPlacements, ['overwrite:folder-b'], 'none placeholder resulttargetfolder');

console.log('media-pool-progressive-import.verify: failures and conflict choices preserve batch progress');
