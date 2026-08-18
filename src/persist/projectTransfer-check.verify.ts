// export/importcheck:src 、validate(file)。
// :npx tsx src/persist/projectTransfer.check.ts( verify:persist, pretest row)。
import assert from 'node:assert/strict';
import { CURRENT_PROJECT_VERSION } from '../../shared/project-version';
import { collectUploadSrcs, parseProjectEnvelope, PROJECT_EXPORT_FORMAT } from './projectTransfer';

const doc = {
  version: 2,
  assets: [
    { id: 'a1', name: 'v.mp4', kind: 'video', src: '/media/uploads/v.mp4', durationInFrames: 60 },
    { id: 'a2', name: 'pic.png', kind: 'image', src: '/media/uploads/pic.png', durationInFrames: 90 },
    { id: 'a3', name: 'ext', kind: 'image', src: 'https://cdn.example.com/x.png', durationInFrames: 90 },
  ],
  timelines: [{
    id: 'tl_1', name: 'sequence 1', order: 0, fps: 30, width: 1920, height: 1080, selectedId: null,
    items: [
      { id: 'i1', name: 'v.mp4', kind: 'video', track: 'v1', startFrame: 0, durationInFrames: 60, src: '/media/uploads/v.mp4' },
      { id: 'i2', name: 'bgm.mp3', kind: 'audio', track: 'a1', startFrame: 0, durationInFrames: 60, src: '/media/uploads/bgm.mp3' },
      { id: 'i3', name: 'title', kind: 'text', track: 'v2', startFrame: 0, durationInFrames: 30 },
    ],
  }],
  activeTimelineId: 'tl_1',
};

// ── collectUploadSrcs ───────────────────────────────────────────────────
{
  const srcs = collectUploadSrcs(doc as never);
  assert.deepEqual(srcs, ['/media/uploads/v.mp4', '/media/uploads/pic.png', '/media/uploads/bgm.mp3'],
    'asset+timeline,unique,outer');
  console.log('collectUploadSrcs: OK');
}

// ── parseProjectEnvelope ────────────────────────────────────────────────
{
  const good = {
    format: PROJECT_EXPORT_FORMAT, name: 'My Project', exportedAt: '2026-07-18T00:00:00Z', doc,
    chat: { messages: [], llm: [] },
    creativeMode: 'long-video-to-shorts',
    media: [
      { src: '/media/uploads/v.mp4', name: 'v.mp4', mime: 'video/mp4', bytes: 10, dataBase64: 'AAAA' },
    ],
  };
  const migrationProgress: Array<[number, number]> = [];
  const parsed = parseProjectEnvelope(JSON.stringify(good), {
    onProgress: (event) => migrationProgress.push([event.fromVersion, event.toVersion]),
  });
  assert.ok('envelope' in parsed, `:${'error' in parsed ? parsed.error : ''}`);
  if ('envelope' in parsed) {
    assert.equal(parsed.envelope.name, 'My Project', 'trim');
    assert.equal(parsed.envelope.media.length, 1, 'media');
    assert.equal(parsed.envelope.media[0].src, '/media/uploads/v.mp4');
    assert.ok(parsed.envelope.chat, 'chat');
    assert.equal(parsed.envelope.creativeMode, 'long-video-to-shorts');
    assert.equal(parsed.envelope.doc.timelines.length, 1, 'doc migrateProjectDoc');
    assert.equal(parsed.envelope.doc.version, CURRENT_PROJECT_VERSION, 'oldimportfilecurrentversion');
    // One progress event per public migration step.
    const expectedSteps = Array.from({ length: CURRENT_PROJECT_VERSION - 2 }, (_, i) => [2 + i, 3 + i]);
    assert.deepEqual(migrationProgress, expectedSteps, 'import');
  }

  // Any unsafe/oversized media entry rejects the whole envelope (untrusted input).
  for (const bad of [
    { src: '/media/uploads/../etc', name: 'x', mime: 'x', bytes: 1, dataBase64: 'AA' },      //
    { src: '/media/uploads/ok.png', name: 'a/b.png', mime: 'x', bytes: 1, dataBase64: 'AA' }, // name path
    { src: '/media/uploads/big.mov', name: 'big.mov', mime: 'x', bytes: 1e12, dataBase64: 'AA' }, // limit
    { src: '/media/uploads/nob64.png', name: 'n.png', mime: 'x', bytes: 5, dataBase64: '' },  // empty
  ]) {
    const withBad = parseProjectEnvelope(JSON.stringify({ ...good, media: [good.media[0], bad] }));
    assert.ok('error' in withBad, `mediapackage:${JSON.stringify(bad.src)}`);
  }

  assert.deepEqual(parseProjectEnvelope('not json'), { error: 'Not a valid JSON file' });
  const wrongFormat = parseProjectEnvelope(JSON.stringify({ ...good, format: 'foreign-project@1' }));
  assert.ok('error' in wrongFormat, 'pluginpackage');
  const badDoc = parseProjectEnvelope(JSON.stringify({ ...good, doc: { timelines: [] } }));
  assert.ok('error' in badDoc, 'emptytimeline doc');
  const badChat = parseProjectEnvelope(JSON.stringify({ ...good, chat: { messages: 'x' } }));
  assert.ok('envelope' in badChat && !(badChat as { envelope: { chat?: unknown } }).envelope.chat, 'chat');
  console.log('parseProjectEnvelope: OK');
}

console.log('\nprojectTransfer.check: ALL PASSED');
