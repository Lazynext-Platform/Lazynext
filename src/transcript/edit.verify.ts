// edit window(trim window)check:npx tsx src/transcript/edit.check.ts
// fps=10,,frame=×10,。
import assert from 'node:assert';
import { editedFrames, itemWindow, keptSegments, keptWordIndices, mediaWindowKeptIndices, mediaWindowWords, retimeWords } from './edit';
import type { TranscriptWord } from './types';

const FPS = 10;
const W: TranscriptWord[] = [
  { text: 'a', start: 0, end: 1000 },     // f0-10
  { text: 'b', start: 1000, end: 2000 },  // f10-20
  { text: 'c', start: 3000, end: 4000 },  // f30-40(front 1s )
  { text: 'd', start: 4000, end: 5000 },  // f40-50
];
const none = new Set<number>();

// ── :nonewindowrow ──────────────────────────────────────────────
{
  const segs = keptSegments(W, none, FPS, 0);
  assert.deepEqual(segs, [{ srcStartFrame: 0, srcEndFrame: 50, fromFrame: 0, durFrames: 50 }]);
  assert.equal(editedFrames(W, none, FPS), 50);
  assert.deepEqual(keptWordIndices(W, none, FPS), [0, 1, 2, 3]);
  assert.equal(retimeWords(W, none, FPS, 0).length, 4);
}

// ── window:[0, alllong) nonewindow ─────────────────────────────────────
{
  const segs = keptSegments(W, none, FPS, 0, { window: { startFrame: 0, durFrames: 50 } });
  assert.deepEqual(segs, [{ srcStartFrame: 0, srcEndFrame: 50, fromFrame: 0, durFrames: 50 }]);
}

// ── left 15 frame:, a 、b windowdot ─────────────────────
{
  const opts = { window: { startFrame: 15, durFrames: 35 } };
  const segs = keptSegments(W, none, FPS, 100, opts); // offset 100 verify
  assert.deepEqual(segs, [{ srcStartFrame: 15, srcEndFrame: 50, fromFrame: 100, durFrames: 35 }]);
  assert.deepEqual(keptWordIndices(W, none, FPS, opts), [1, 2, 3], 'windowouter a');
  const words = retimeWords(W, none, FPS, 100, opts);
  assert.equal(words.length, 3);
  assert.equal(words[0].text, 'b');
  assert.equal(Math.round(words[0].start), 100 / FPS * 1000, 'b clip dot');
}

// ── right:,d 、c short ────────────────────────────────────────
{
  const opts = { window: { startFrame: 0, durFrames: 35 } };
  const segs = keptSegments(W, none, FPS, 0, opts);
  assert.deepEqual(segs, [{ srcStartFrame: 0, srcEndFrame: 35, fromFrame: 0, durFrames: 35 }]);
  assert.deepEqual(keptWordIndices(W, none, FPS, opts), [0, 1, 2]);
}

// ── centerwindow: ────────────────────────────────────────────────────
{
  const opts = { window: { startFrame: 15, durFrames: 20 } }; // [15,35)
  assert.deepEqual(keptWordIndices(W, none, FPS, opts), [1, 2]);
}

// ── + window:new ─────────────────────────────────
{
  const del = new Set([1]); // b → 1 [0,10) + 2 [30,50),long 30
  const base = keptSegments(W, del, FPS, 0);
  assert.deepEqual(base, [
    { srcStartFrame: 0, srcEndFrame: 10, fromFrame: 0, durFrames: 10 },
    { srcStartFrame: 30, srcEndFrame: 50, fromFrame: 10, durFrames: 20 },
  ]);
  const segs = keptSegments(W, del, FPS, 0, { window: { startFrame: 5, durFrames: 20 } }); // [5,25)
  assert.deepEqual(segs, [
    { srcStartFrame: 5, srcEndFrame: 10, fromFrame: 0, durFrames: 5 },   // 1
    { srcStartFrame: 30, srcEndFrame: 45, fromFrame: 5, durFrames: 15 }, // 2 ,top
  ]);
}

// ── window:long → empty;editedFrames 1 ─────────────────────
{
  const segs = keptSegments(W, none, FPS, 0, { window: { startFrame: 60, durFrames: 10 } });
  assert.equal(segs.length, 0);
  assert.equal(editedFrames(W, none, FPS, { window: { startFrame: 60, durFrames: 10 } }), 1);
}

// ── itemWindow: audio window(video srcInFrame mediaframe)────
{
  assert.deepEqual(itemWindow({ kind: 'audio', srcInFrame: 15, durationInFrames: 35 }), { startFrame: 15, durFrames: 35 });
  assert.equal(itemWindow({ kind: 'video', srcInFrame: 15, durationInFrames: 35 }), undefined);
  assert.deepEqual(itemWindow({ kind: 'audio', durationInFrames: 50 }), { startFrame: 0, durFrames: 50 });
}

// ── video mediawindow(longshort e2e )────────────────────
// video play [srcIn, srcIn+dur×rate),captionmediaframe;:
// transcript hidden(window"caption")。
{
  const s = (sec: number): number => sec * 1000; // ms;frame = sec×FPS
  const W: TranscriptWord[] = [
    { text: 'a', start: s(0), end: s(1) },   // frame 0×FPS-1×FPS(outer)
    { text: 'b', start: s(7), end: s(8) },   // 7×FPS-8×FPS
    { text: 'c', start: s(12), end: s(13) }, // 12×FPS-13×FPS
    { text: 'd', start: s(20), end: s(21) }, // outer(rate=1 )
  ];
  const item = { startFrame: 10, durationInFrames: 12 * FPS, srcInFrame: 6 * FPS }; // window [6s,18s)
  const out = mediaWindowWords(W, FPS, item);
  assert.deepEqual(out.map((w) => w.text), ['b', 'c'], 'windowinner b/c,a/d outer');
  assert.equal(Math.round(out[0].start), Math.round(((10 + 1 * FPS) / FPS) * 1000), 'b startFrame+1s');
  assert.equal(Math.round(out[1].start), Math.round(((10 + 6 * FPS) / FPS) * 1000), 'c offset 6s');
  // index(wordOverrides )
  assert.deepEqual(mediaWindowKeptIndices(W, FPS, item), [1, 2]);
  // 2× :window [6s, 6s+12s×2)=[6s,30s) → d ,timelineposition
  const fast = { startFrame: 0, durationInFrames: 12 * FPS, srcInFrame: 6 * FPS, playbackRate: 2 };
  const outFast = mediaWindowWords(W, FPS, fast);
  assert.deepEqual(outFast.map((w) => w.text), ['b', 'c', 'd']);
  assert.equal(Math.round(outFast[2].start), Math.round(((20 - 6) / 2) * 1000), 'bottommediaframe rate');
}

console.log('edit.check: ok (nonewindow//left/right/center///itemWindow kind /video media)');
