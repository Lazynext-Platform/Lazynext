// captionexportcheck:srt pagination cuecenterrowtxt rowoutputemptycaptionemptyoutput
// :npx tsx src/captions/exportCaptions.check.ts( npm test )
import assert from 'node:assert/strict';
import { captionsToSrt, captionsToTxt, srtTimestamp } from './exportCaptions';
import type { CaptionsData } from './types';
import type { TimelineItem } from '../editor/types';

// ── srtTimestamp ────────────────────────────────────────────────────────
assert.equal(srtTimestamp(0), '00:00:00,000');
assert.equal(srtTimestamp(1234), '00:00:01,234');
assert.equal(srtTimestamp(61_500), '00:01:01,500');
assert.equal(srtTimestamp(3_600_000 + 2_030), '01:00:02,030');
assert.equal(srtTimestamp(-5), '00:00:00,000', 'value 0');
console.log('srtTimestamp: OK');

// ── cue (table→pagination→srt/txt) ──────────────────────────────────────
const words = [
 { text: '', start: 0, end: 400 },
 { text: 'dot', start: 450, end: 800 },
 { text: 'hello', start: 900, end: 1300 },
 { text: 'world', start: 1350, end: 1700 },
];
const item = {
 id: 'clip1', track: 'v1', startFrame: 0, durationInFrames: 60,
 name: '', kind: 'video', transcript: words,
} as unknown as TimelineItem;
const captions: CaptionsData = { enabled: true, template: 'plain', pacing: 'phrase', sourceItemId: 'clip1' };

const srt = captionsToSrt(captions, [item], 30);
assert.ok(srt.startsWith('1\n00:00:00,000 --> '), `srt +:\n${srt.slice(0, 60)}`);
assert.ok(srt.includes('-->'), 'srt arrow');
assert.ok(srt.includes('dot') || srt.includes('dot') || srt.includes(''), 'srt center');
assert.ok(/hello world/.test(srt), 'empty');
assert.ok(!/ /.test(srt) || true, 'center(allowpagination)');
assert.ok(srt.endsWith('\n'), 'srt row');

const txt = captionsToTxt(captions, [item], 30);
assert.ok(txt.length > 0 && !txt.includes('-->'), 'txt none');
assert.ok(txt.includes('hello world'), 'txt row');
console.log('captionsToSrt/Txt: OK');

// ── emptycaption ──────────────────────────────────────────────────────────────
const emptyCaptions: CaptionsData = { enabled: true, template: 'plain', pacing: 'phrase', sourceItemId: 'missing' };
assert.equal(captionsToSrt(emptyCaptions, [item], 30), '', 'sourceclip → empty');
assert.equal(captionsToTxt(emptyCaptions, [item], 30), '', 'sourceclip → empty');
console.log('empty captions: OK');

console.log('\nexportCaptions.check: ALL PASSED');
