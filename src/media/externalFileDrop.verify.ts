import assert from 'node:assert/strict';
import { classifyExternalFile, parseDroppedCaptions } from './externalFileDrop';

assert.deepEqual(classifyExternalFile({ name: 'row.mp4', type: 'video/mp4' }), {
  type: 'media', mediaKind: 'video',
});
assert.deepEqual(classifyExternalFile({ name: '.mp3', type: 'audio/mpeg' }), {
  type: 'media', mediaKind: 'audio',
});
assert.deepEqual(classifyExternalFile({ name: 'caption.srt', type: '' }), {
  type: 'caption', format: 'srt',
});
assert.deepEqual(
  parseDroppedCaptions(
    'caption.srt',
    '1\n00:00:01,000 --> 00:00:02,500\n\n\n2\n00:00:03,000 --> 00:00:04,000\n',
    10000,
  ),
  [
    { text: '', start: 10000, end: 11500 },
    { text: '', start: 12000, end: 13000 },
  ],
);
assert.deepEqual(
  parseDroppedCaptions('.txt', 'row\n\nrow', 4000),
  [
    { text: 'row', start: 4000, end: 7000 },
    { text: 'row', start: 7000, end: 10000 },
  ],
);

console.log('externalFileDrop.verify: Finder media and caption classification OK');
