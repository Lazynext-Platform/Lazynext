import assert from 'node:assert/strict';
import { matchRelinkFile } from './mediaRelinkMatch';

const file = (name: string, type = ''): File => new File([new Uint8Array([1])], name, { type });

const asset = (name: string, extra: Partial<{ sourceFilename: string; kind: string }> = {}) => ({
  name,
  sourceFilename: extra.sourceFilename,
  kind: (extra.kind ?? 'image') as 'video' | 'image' | 'audio' | 'gif' | 'svg',
});

async function main(): Promise<void> {
  // 1. Exact filename match (case-insensitive) wins.
  assert.equal(matchRelinkFile(asset('.png'), [file('.png')])?.name, '.png');
  assert.equal(matchRelinkFile(asset('Star.png'), [file('star.PNG')])?.name, 'star.PNG');
  // sourceFilename (original file name) is preferred over display name.
  assert.equal(
    matchRelinkFile(asset('', { sourceFilename: '.mp4' }), [file('.mp4'), file('.mp4')])?.name,
    '.mp4',
  );

  // 2. Stem match bridges extension changes (mp4 → mov) — the #48 report case.
  assert.equal(matchRelinkFile(asset('.mp4', { kind: 'video' }), [file('.mov')])?.name, '.mov');
  assert.equal(matchRelinkFile(asset('clip.mov', { kind: 'video' }), [file('CLIP.mp4')])?.name, 'CLIP.mp4');

  // 3. Multiple stem candidates: prefer the kind-matching file.
  assert.equal(
    matchRelinkFile(asset('asset', { kind: 'audio' }), [file('asset.mp4'), file('asset.mp3')])?.name,
    'asset.mp3',
  );
  assert.equal(
    matchRelinkFile(asset('asset', { kind: 'video' }), [file('asset.mp4'), file('asset.mp3')])?.name,
    'asset.mp4',
  );

  // 4. Ambiguous stems with no kind match → null (no silent wrong relink).
  assert.equal(matchRelinkFile(asset('asset', { kind: 'image' }), [file('asset.mp4'), file('asset.mp3')]), null);

  // 5. No name / no match → null.
  assert.equal(matchRelinkFile(asset(''), [file('x.png')]), null);
  assert.equal(matchRelinkFile(asset('.png'), [file('.png')]), null);

  // 6. Exact match beats stem match even when stems collide.
  assert.equal(
    matchRelinkFile(asset('a.png'), [file('a.png'), file('a.jpg')])?.name,
    'a.png',
  );

  console.log('mediaRelinkMatch.verify: all assertions passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
