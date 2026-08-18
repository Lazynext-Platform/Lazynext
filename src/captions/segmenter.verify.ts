// Caption segmentation engine verification.
// Tests CJK punctuation breaks, Latin breakpoint scoring, CJK character
// unit counting, CJK-Latin boundary detection, and pagination.
import assert from 'node:assert/strict';
import { scoreLatinBreaks, segmentWords } from './segmenter';
import type { CaptionPage } from './types';
import { paginate } from './types';
import type { TranscriptWord } from '../transcript/types';

const S = (texts: string[]) => texts.map((text) => ({ text }));
const W = (texts: string[], gapMs = 10, durMs = 90): TranscriptWord[] =>
  texts.map((text, i) => ({ text, start: i * (durMs + gapMs), end: i * (durMs + gapMs) + durMs }));
const pageTexts = (pages: CaptionPage[]) => pages.map((p) => p.words.map((w) => w.text).join(''));

// ── ① CJK punctuation breaks (。→100 / ，→80) ──────────────────
{
  const words = S(['你好', '世界', '。', '今天', '天气', '不错', '啊']);
  assert.deepEqual(segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 20 }), [0, 3]);

  const comma = S(['好的，', '今天天气真的非常不错很好继续加油努力工作']);
  assert.deepEqual(segmentWords(comma, { wordsPerPage: 50, maxCharsPerLine: 20 }), [0, 1]);
}

// ── ② CJK word segmentation with maxCharsPerLine ───────────────
{
  // 8 two-char CJK words, break at 20-unit boundary (5 words = 20 units)
  const ne = S(['你好', '世界', '今天', '天气', '不错', '明天', '更好', '啊']);
  const starts = segmentWords(ne, { wordsPerPage: 50, maxCharsPerLine: 20 });
  assert.deepEqual(starts, [0, 5]);

  // Single-char CJK words: Intl.Segmenter keeps '你好' and '世界' together
  const ma = S(['你', '好', '世', '界', '今天', '天气']);
  const maStarts = segmentWords(ma, { wordsPerPage: 50, maxCharsPerLine: 8 });
  assert.ok(!maStarts.includes(2) && !maStarts.includes(3), 'no break inside CJK words');

  // Mixed Latin/CJK with boundary break
  const pull = S(['OK', 'fine', '你好', 'bottom', '世界']);
  assert.deepEqual(segmentWords(pull, { wordsPerPage: 50, maxCharsPerLine: 15 }), [0, 3]);
}

// ── ③ CJK-Latin boundary: Latin word after CJK content ─────────
{
  const words = S(['你', '好', '世', '界', '今天', '非常', '不错', 'new']);
  const starts = segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 10 });
  assert.ok(starts[0] === 0, 'first page starts at 0');
  assert.ok(starts.includes(0), 'CJK content is segmented');
  assert.ok(!starts.includes(2) && !starts.includes(3), 'no break inside CJK words');
}

// ── ④ Latin quantifier: "a lot of" stays together ──────────────
{
  const words = S(['We', 'learned', 'quite', 'a', 'lot', 'of', 'things', 'today']);
  const starts = segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 30 });
  assert.deepEqual(starts, [0, 3]);
  const pages = [words.slice(0, 3), words.slice(3)].map((ws) => ws.map((w) => w.text));
  assert.equal(pages[0].join(' '), 'We learned quite');
  assert.equal(pages[1].join(' '), 'a lot of things today');
  for (let i = 0; i < starts.length; i++) {
    const end = (starts[i + 1] ?? words.length) - 1;
    assert.notEqual(words[end].text, 'of', 'do not end page on "of"');
  }
}

// ── ⑤ Latin sentence-end period: +30 bonus ────────────────────
{
  const words = S(['I', 'like', 'it.', 'Because', 'it', 'works', 'well', 'today']);
  assert.deepEqual(segmentWords(words, { wordsPerPage: 50, maxCharsPerLine: 30 }), [0, 3]);
  assert.deepEqual(segmentWords(S(['I', 'like', 'it.', 'Because', 'it', 'works']), { wordsPerPage: 4 }), [0, 3]);
  const top = scoreLatinBreaks('We had fun. So it goes')[0];
  assert.equal(top.score, 130);
  assert.equal(top.position, 'We had fun.'.length);
}

// ── ⑥ wordsPerPage paging and edge cases ───────────────────────
{
  const starts = segmentWords(S(['Hello', 'world', '!', 'again', 'now', 'yes', 'more']), { wordsPerPage: 2 });
  assert.deepEqual(starts, [0, 3, 5]); // '!' does not start a page
  // CJK dominant with large maxCharsPerLine → single page
  assert.deepEqual(segmentWords(S(['你好', '世界', '今天', '天气']), { wordsPerPage: 2, maxCharsPerLine: 100 }), [0]);
  assert.deepEqual(segmentWords(S(['aa', 'bb', 'cc', 'dd']), { wordsPerPage: 2, maxCharsPerLine: 100 }), [0, 2]);
  assert.deepEqual(segmentWords([], { wordsPerPage: 6 }), []);
  assert.deepEqual(segmentWords(S(['hi']), { wordsPerPage: 1, maxCharsPerLine: 1 }), [0]);
}

// ── paginate: maxCharsPerLine × visual lines; forceBreak ───────
{
  const cn = W(['你好', '世界', '。', '今天', '天气', '不错', '啊']);
  // 20 units/line × CAPTION_MAX_VISUAL_LINES(2) = 40 units — the 12-char sentence fits one page.
  assert.deepEqual(pageTexts(paginate(cn, 'phrase', 50, undefined, 20)), ['你好世界。今天天气不错啊']);
  const forced = paginate(cn, 'phrase', 50, new Set([5]), 20);
  assert.deepEqual(pageTexts(forced), ['你好世界。今天天气', '不错啊']);
  // word pacing: one word per page
  assert.equal(paginate(cn, 'word', 6, undefined, 20).length, cn.length);
}

// ── paginate: no maxCharsPerLine uses default wordsPerPage ──────
{
  const plain = W(['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh']);
  assert.deepEqual(paginate(plain, 'phrase').map((p) => p.words.length), [6, 2]);
  assert.deepEqual(paginate(W(['Hi', 'there.', 'Big', 'day']), 'phrase').map((p) => p.words.length), [4]);
  // long gap does not split if content fits
  const gap: TranscriptWord[] = [
    { text: 'a', start: 0, end: 100 }, { text: 'b', start: 110, end: 200 },
    { text: 'c', start: 1000, end: 1100 }, { text: 'd', start: 1110, end: 1200 },
  ];
  assert.deepEqual(paginate(gap, 'phrase').map((p) => p.words.length), [4]);
  // forceBreak
  assert.deepEqual(paginate(W(['aa', 'bb', 'cc', 'dd']), 'phrase', 6, new Set([2])).map((p) => p.words.length), [2, 2]);
  // page bounds
  const pages = paginate(plain, 'phrase');
  assert.equal(pages[0].start, plain[0].start);
  assert.equal(pages[0].end, plain[5].end);
  assert.equal(pages[1].start, plain[6].start);
}

console.log('segmenter.check: ok');
