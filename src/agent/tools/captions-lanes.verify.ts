// captioncheck:npx tsx src/agent/tools/captions-lanes.check.ts
// ① lanes.ts (auto-stack/single-lane/manual-slots/positions groupBy)
// ② ensureEntries ③ matchEntries select ④ action validate
import assert from 'node:assert/strict';
import type { CaptionsData, CaptionSourceEntry } from '../../captions/types';
import { buildLaneGroups } from '../../captions/lanes';
import type { TimelineItem, TimelineState } from '../../editor/types';
import type { AgentContext } from '../context';
import { ensureEntries, matchEntries, execLayoutPolicy, execPositions, execSourceUpdate } from './captions-lanes';

// fps=1000 → ms frame。transcript audio:a 0-200ms,b 50-250ms()。
const itemA: TimelineItem = {
  id: 'a', kind: 'audio', name: 'voA', track: 'A1', startFrame: 0, durationInFrames: 200,
  transcript: [{ text: 'hi', start: 0, end: 100 }, { text: 'there', start: 100, end: 200 }],
} as TimelineItem;
const itemB: TimelineItem = {
  id: 'b', kind: 'audio', name: 'voB', track: 'A2', startFrame: 0, durationInFrames: 250,
  transcript: [{ text: 'yo', start: 50, end: 150 }, { text: 'friend', start: 150, end: 250 }],
} as TimelineItem;
const S: TimelineState = { fps: 1000, width: 1920, height: 1080, selectedId: null, items: [itemA, itemB] } as TimelineState;

const entries2: CaptionSourceEntry[] = [{ id: 's1', itemId: 'a' }, { id: 's2', itemId: 'b' }];
const cap = (over: Partial<CaptionsData>): CaptionsData =>
  ({ enabled: true, template: 'plain', pacing: 'word', sourceEntries: entries2, ...over }) as CaptionsData;

// ── :default auto-stack,topbottom(columntable = top→bottom)──────────────
{
  const groups = buildLaneGroups(cap({}), S.items, S.fps, 60, 6)!;
  assert.equal(groups.length, 1, 'none anchor →');
  assert.equal(groups[0].anchor, undefined);
  assert.deepEqual(groups[0].lanes.map((l) => l.entry.id), ['s1', 's2'], 'columntablerender,firsttop');
  assert.deepEqual(groups[0].lanes.map((l) => l.page.words[0].text), ['hi', 'yo']);
}
// maxVisibleSources=1
{
  const groups = buildLaneGroups(cap({ layoutPolicy: { mode: 'auto-stack', maxVisibleSources: 1 } }), S.items, S.fps, 60, 6)!;
  assert.deepEqual(groups[0].lanes.map((l) => l.entry.id), ['s1']);
}
// single-lane:default 1 ;priority small
{
  const g1 = buildLaneGroups(cap({ layoutPolicy: { mode: 'single-lane' } }), S.items, S.fps, 60, 6)!;
  assert.deepEqual(g1[0].lanes.map((l) => l.entry.id), ['s1'], 'columntable');
  const withPrio: CaptionSourceEntry[] = [{ id: 's1', itemId: 'a', priority: 5 }, { id: 's2', itemId: 'b', priority: 0 }];
  const g2 = buildLaneGroups(cap({ sourceEntries: withPrio, layoutPolicy: { mode: 'single-lane' } }), S.items, S.fps, 60, 6)!;
  assert.deepEqual(g2[0].lanes.map((l) => l.entry.id), ['s2'], 'priority');
}
// per-entry anchor:differentdotgroupBy;equaldotcomposite。
{
  const placed: CaptionSourceEntry[] = [
    { id: 's1', itemId: 'a', anchor: 'top-center', offsetYRatio: 0.08 },
    { id: 's2', itemId: 'b', anchor: 'bottom-center', offsetYRatio: -0.08 },
  ];
  const groups = buildLaneGroups(cap({ sourceEntries: placed }), S.items, S.fps, 60, 6)!;
  assert.equal(groups.length, 2, 'dot →');
  const sameAnchor = placed.map((e) => ({ ...e, anchor: 'top-center' as const, offsetYRatio: 0.08 }));
  const merged = buildLaneGroups(cap({ sourceEntries: sameAnchor }), S.items, S.fps, 60, 6)!;
  assert.equal(merged.length, 1, 'dot →');
  assert.equal(merged[0].lanes.length, 2);
}
// manual-slots:slotId
{
  const pinned: CaptionSourceEntry[] = [{ id: 's1', itemId: 'a', slotId: 'top' }, { id: 's2', itemId: 'b', slotId: 'bottom' }];
  const groups = buildLaneGroups(cap({
    sourceEntries: pinned,
    layoutPolicy: { mode: 'manual-slots', slots: [{ id: 'top', anchor: 'top-center', offsetYRatio: 0.08 }, { id: 'bottom', anchor: 'bottom-center', offsetYRatio: -0.08 }] },
  }), S.items, S.fps, 60, 6)!;
  assert.deepEqual(groups.map((g) => g.anchor).sort(), ['bottom-center', 'top-center']);
}
// visiblerender;none sourceEntries → null(oldpath)
{
  const hidden: CaptionSourceEntry[] = [{ id: 's1', itemId: 'a', visible: false }, { id: 's2', itemId: 'b' }];
  const groups = buildLaneGroups(cap({ sourceEntries: hidden }), S.items, S.fps, 60, 6)!;
  assert.deepEqual(groups[0].lanes.map((l) => l.entry.id), ['s2']);
  assert.equal(buildLaneGroups(cap({ sourceEntries: undefined }), S.items, S.fps, 60, 6), null);
}

// ── ensureEntries + matchEntries select ────────────────────────────────
{
  const fromItem = ensureEntries({ enabled: true, template: 'plain', pacing: 'word', sourceItemId: 'a' } as CaptionsData, S);
  assert.equal(fromItem.length, 1);
  assert.equal(fromItem[0].itemId, 'a');
  const fromLegacy = ensureEntries({ enabled: true, template: 'plain', pacing: 'word', sources: ['a', 'b'] } as CaptionsData, S);
  assert.deepEqual(fromLegacy.map((e) => e.itemId), ['a', 'b']);
  const fromTimeline = ensureEntries({ enabled: true, template: 'plain', pacing: 'word', sourceMode: 'timeline' } as CaptionsData, S);
  assert.deepEqual(fromTimeline.map((e) => e.itemId), ['a', 'b']);
}
{
  // entries2 carries stable ids → the index selector is legacy-only by design.
  const legacyIdx = matchEntries(entries2, { index: 1 }, S);
  assert.ok(
    'error' in (legacyIdx as object)
    && /legacy-only/.test((legacyIdx as { error: string }).error),
    'stable-id entries reject the index selector',
  );
  assert.deepEqual(matchEntries(entries2, { sourceId: 's2' }, S), [1]);
  assert.deepEqual(matchEntries(entries2, { trackId: 'A2' }, S), [1]);
  assert.deepEqual(matchEntries(entries2, { itemId: 'a' }, S), [0]);
  const err = matchEntries(entries2, { speakerId: 'sp1' }, S);
  assert.ok('error' in (err as object), 'speakerId → not support');
  const miss = matchEntries(entries2, { label: 'nope' }, S);
  assert.ok('error' in (miss as object));
}

// ── action (mock ctx catch updateCaptions patch)──────────────────────────
let lastPatch: Partial<CaptionsData> | null = null;
const ctx = { commands: { updateCaptions: (p: Partial<CaptionsData>) => { lastPatch = p; } } } as unknown as AgentContext;

// positions:;anchor validate; sourceEntries
{
  lastPatch = null;
  const r = execPositions({ positions: [
    { sourceId: 's1', anchor: 'bottom-center', offsetYRatio: -0.08 },
    { sourceId: 's2', anchor: 'top-center', offsetYRatio: 0.08 },
  ] }, cap({}), ctx, S);
  assert.equal(r.ok, true, JSON.stringify(r));
  assert.equal(lastPatch!.sourceEntries![0].anchor, 'bottom-center');
  assert.equal(lastPatch!.sourceEntries![1].anchor, 'top-center');
  const bad = execPositions({ positions: [{ sourceId: 's1', anchor: 'nowhere' }] }, cap({}), ctx, S);
  assert.ok(bad.error, 'anchor');
}
// layout_policy:mode + perSource + + validate
{
  lastPatch = null;
  const r = execLayoutPolicy({ mode: 'auto-stack', maxVisibleSources: 2 }, cap({}), ctx);
  assert.equal(r.ok, true);
  assert.deepEqual(lastPatch!.layoutPolicy, { mode: 'auto-stack', maxVisibleSources: 2 });
  const slots = execLayoutPolicy({ mode: 'manual-slots', slots: [{ id: 'top', anchor: 'top-center' }] }, cap({}), ctx);
  assert.equal(slots.ok, true);
  const noSlots = execLayoutPolicy({ mode: 'manual-slots' }, cap({}), ctx);
  assert.ok(noSlots.error);
  const badMode = execLayoutPolicy({ mode: 'diagonal' }, cap({}), ctx);
  assert.ok(badMode.error);
  lastPatch = null;
  const per = execLayoutPolicy({ perSource: { s2: { maxLines: 2 } } }, cap({}), ctx);
  assert.equal(per.ok, true);
  assert.deepEqual(lastPatch!.perSource, { s2: { maxLines: 2 } });
  lastPatch = null;
  const clear = execLayoutPolicy({ layoutPolicy: null }, cap({}), ctx);
  assert.equal(clear.ok, true);
  assert.equal(lastPatch!.layoutPolicy, null);
}
// source_update:visible/anchor/style(sizePx→fontSize )/variant validate
{
  lastPatch = null;
  const r = execSourceUpdate({ updates: [
    { sourceId: 's2', anchor: 'top-center', offsetYRatio: 0.08, style: { sizePx: 54, color: '#fff' } },
    { sourceId: 's1', visible: false },
  ] }, cap({}), ctx, S);
  assert.equal(r.ok, true, JSON.stringify(r));
  const es = lastPatch!.sourceEntries!;
  assert.equal(es[1].anchor, 'top-center');
  assert.ok(Math.abs((es[1].style!.fontSize ?? 0) - 54 / 1080) < 1e-9, 'sizePx → fontSize (canvasHeight)');
  assert.equal(es[1].style!.color, '#fff');
  assert.equal(es[0].visible, false);
  const noVar = execSourceUpdate({ updates: [{ sourceId: 's1', languageCode: 'en' }] }, cap({}), ctx, S);
  assert.ok(noVar.error, 'none variant ( translation_ensure)');
}

console.log('captions-lanes.check: ok ( 6 / / select / action +validate)');
