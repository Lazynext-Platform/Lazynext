// assetcleanupcheck:、(inner projectStore )。
// :npx tsx src/persist/mediaCleanup.check.ts( verify:persist, pretest row)。
import assert from 'node:assert/strict';
import { collectAllUploadRefs, unreferencedOf } from './mediaCleanup';
import { createProject, listProjectDocIds, purgeProject } from './projectStore';
import type { ProjectDoc } from '../editor/types';

// ── unreferencedOf: − ──────────────────────────────────────────
{
  const files = [
    { name: 'a.mp4', bytes: 10, mtimeMs: 1 },
    { name: '_01_.mp3', bytes: 20, mtimeMs: 2 },
    { name: 'kept.png', bytes: 30, mtimeMs: 3 },
  ];
  const refs = new Set(['/media/uploads/kept.png']);
  const orphans = unreferencedOf(files, refs);
  assert.deepEqual(orphans.map((f) => f.name), ['a.mp4', '_01_.mp3'], 'none(center)');
  console.log('unreferencedOf: OK');
}

// ── + (inner projectStore) ────────────────────────────
{
  const doc = (src: string): ProjectDoc => ({
    version: 3,
    assets: [{ id: 'a1', name: 'x', kind: 'video', src, durationInFrames: 30 }],
    mediaFolders: [],
    timelines: [{ id: 'tl1', name: 'sequence 1', fps: 30, width: 1920, height: 1080, selectedId: null, items: [] } as never],
    activeTimelineId: 'tl1',
  } as never);
  const shared = '/media/uploads/shared.mp4';
  const solo = '/media/uploads/solo.mp4';
  const p1 = await createProject('', doc(shared));
  const p2 = await createProject('', doc(shared));
  const p3 = await createProject('', doc(solo));

  let refs = await collectAllUploadRefs();
  assert.ok(refs.has(shared) && refs.has(solo), 'all');

  // p3 back solo none → ;shared p2 →
  refs = await collectAllUploadRefs(p3.id);
  assert.ok(!refs.has(solo) && refs.has(shared), 'back:,');

  // p1 back shared p2
  await purgeProject(p1.id);
  refs = await collectAllUploadRefs();
  assert.ok(refs.has(shared), 'copy,asset');

  for (const m of [p2, p3]) await purgeProject(m.id);
  assert.equal((await listProjectDocIds()).length, 0, 'purge back');
  console.log('collectAllUploadRefs/: OK');
}

console.log('\nmediaCleanup.check: ALL PASSED');
