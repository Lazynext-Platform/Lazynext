// inner:①centerdot ②row ③「」
// ④ ⑤ ⑥none opts paginate old()。
// value segmenter.ts ;:npx tsx src/captions/segmenter.check.ts
import assert from 'node:assert/strict';
import { scoreLatinBreaks, segmentWords } from './segmenter';
import type { CaptionPage } from './types';
import { paginate } from './types';
import type { TranscriptWord } from '../transcript/types';

const S = (texts: string[]) => texts.map((text) => ({ text }));
const W = (texts: string[], gapMs = 10, durMs = 90): TranscriptWord[] =>
  texts.map((text, i) => ({ text, start: i * (durMs + gapMs), end: i * (durMs + gapMs) + durMs }));
const pageTexts = (pages: CaptionPage[]) => pages.map((p) => p.words.map((w) => w.text).join(''));

// ── ① center/(oHe: 。→100 / ，→80 ) ──────────────
{
  const words = S(['', '', '。', '', '', '', '']);
  // 「」,fallbackdot → 。 after
  assert.deepEqual(segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 20 }), [0, 3]);

  const comma = S(['，', 'large', '', '', '', '', '']);
  assert.deepEqual(segmentWords(comma, { wordsPerPage: 50, maxCharsPerLine: 20 }), [0, 1]);
}

// ── ② 「//」row ─────────────────────────────────────────────
{
  // :aHe dot(60)「」back,
  const ne = S(['', '', '', '', '', '', '', '']);
  const starts = segmentWords(ne, { wordsPerPage: 50, maxCharsPerLine: 20 });
  assert.deepEqual(starts, [0, 5]); // 2 「」,「」1
  // :mA (/ ∈ Q9)dotall
  const ma = S(['', '', '', '', '', '']);
  const maStarts = segmentWords(ma, { wordsPerPage: 50, maxCharsPerLine: 8 });
  assert.ok(!maStarts.includes(2) && !maStarts.includes(3), '「」「」');
  for (const st of maStarts) assert.ok(!['', '', '', ''].includes(Array.from(ma[st].text)[0]), '');
  for (const st of starts) assert.ok(!['', '', '', ''].includes(Array.from(ne[st].text)[0]), '');
  // FHe row:2 「」 G9e 「」 → top fine
  const pull = S(['OK', 'fine', '', 'bottom', '']);
  assert.deepEqual(segmentWords(pull, { wordsPerPage: 50, maxCharsPerLine: 15 }), [0, 1]);
}

// ── ③ 「」front(mA: ∈ Q9 → dot 30) ──────────
{
  const words = S(['', '', '', '', '', '', '', 'new']);
  const starts = segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 10 });
  assert.deepEqual(starts, [0, 4, 7]);
  assert.ok(!starts.includes(2), '「」(| )');
  assert.ok(!starts.includes(3), '「」(| )');
}

// ── ④ : 1-2 row(U9e quantifier-of/trailing + cP ) ──
{
  const words = S(['We', 'learned', 'quite', 'a', 'lot', 'of', 'things', 'today']);
  const starts = segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 30 });
  // things;a/lot/of dotall → fallback quite after
  assert.deepEqual(starts, [0, 3]);
  const pages = [words.slice(0, 3), words.slice(3)].map((ws) => ws.map((w) => w.text));
  assert.equal(pages[0].join(' '), 'We learned quite');
  assert.equal(pages[1].join(' '), 'a lot of things today');
  for (let i = 0; i < starts.length; i++) {
    const end = (starts[i + 1] ?? words.length) - 1;
    assert.notEqual(words[end].text, 'of', 'empty of');
  }
}

// ── ⑤ . (z9e 100 + +30 = 130) ─────────────────────────
{
  const words = S(['I', 'like', 'it.', 'Because', 'it', 'works', 'well', 'today']);
  assert.deepEqual(segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 30 }), [0, 3]);
  // fallback(, segmenter.ts 2)
  assert.deepEqual(segmentWords(S(['I', 'like', 'it.', 'Because', 'it', 'works']), { wordsPerPage: 4 }), [0, 3]);
  // H9e : 100+30
  const top = scoreLatinBreaks('We had fun. So it goes')[0];
  assert.equal(top.score, 130);
  assert.equal(top.position, 'We had fun.'.length);
}

// ── :dot / M1e CJK / ───────────────────────
{
  const starts = segmentWords(S(['Hello', 'world', '!', 'again', 'now', 'yes', 'more']), { wordsPerPage: 2 });
  assert.deepEqual(starts, [0, 3, 5]); // 「!」 world 1,
  // M1e :CJK + → wordsPerPage empty
  assert.deepEqual(segmentWords(S(['', '', '', '']), { wordsPerPage: 2, maxCharsPerLine: 100 }), [0]);
  assert.deepEqual(segmentWords(S(['aa', 'bb', 'cc', 'dd']), { wordsPerPage: 2, maxCharsPerLine: 100 }), [0, 2]);
  assert.deepEqual(segmentWords([], { wordsPerPage: 6 }), []);
  assert.deepEqual(segmentWords(S(['hi']), { wordsPerPage: 1, maxCharsPerLine: 1 }), [0]);
}

// ── paginate :maxCharsPerLine segmenter( × row);forceBreak high ──
{
  const cn = W(['', '', '。', '', '', '', '']);
  // 20 chars/line × CAPTION_MAX_VISUAL_LINES(2) = 40 chars — the 12-char sentence fits one page.
  assert.deepEqual(pageTexts(paginate(cn, 'phrase', 50, undefined, 20)), ['。']);
  const forced = paginate(cn, 'phrase', 50, new Set([5]), 20);
  assert.deepEqual(pageTexts(forced), ['。', '']);
  assert.equal(forced[1].words[0].text, ''); // dotnew
  // word pacing maxCharsPerLine
  assert.equal(paginate(cn, 'word', 6, undefined, 20).length, cn.length);
}

// ── ⑥ :none maxCharsPerLine paginate rowold ────────────────────
{
  // 6 full flush
  const plain = W(['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh']);
  assert.deepEqual(paginate(plain, 'phrase').map((p) => p.words.length), [6, 2]);
  // full content-aware dot()
  assert.deepEqual(paginate(W(['Hi', 'there.', 'Big', 'day']), 'phrase').map((p) => p.words.length), [4]);
  // longhighdot,(4 small → )
  const gap: TranscriptWord[] = [
    { text: 'a', start: 0, end: 100 }, { text: 'b', start: 110, end: 200 },
    { text: 'c', start: 1000, end: 1100 }, { text: 'd', start: 1110, end: 1200 },
  ];
  assert.deepEqual(paginate(gap, 'phrase').map((p) => p.words.length), [4]);
  // forceBreak
  assert.deepEqual(paginate(W(['aa', 'bb', 'cc', 'dd']), 'phrase', 6, new Set([2])).map((p) => p.words.length), [2, 2]);
  // page
  const pages = paginate(plain, 'phrase');
  assert.equal(pages[0].start, plain[0].start);
  assert.equal(pages[0].end, plain[5].end);
  assert.equal(pages[1].start, plain[6].start);
}

console.log('segmenter.check: ok');
