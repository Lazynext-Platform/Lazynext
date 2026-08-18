// Runnable: `npx tsx src/agent/font-tools.check.ts`
import assert from 'node:assert';
import { makeDraft } from '../../editor/store';
import { docFromTimeline } from '../../persist/projectStore';
import type { AgentContext } from '../context';
import {
  execFontTool,
  FONT_TOOL_NAMES,
  FONT_TOOL_SCHEMAS,
  fontFallbackGate,
  collectReferencedFonts,
  findUnsupportedFonts,
} from './font-tools';
import { isLoadableFontFamily } from '../../fonts/googleFonts';
import { ensureLocalFont, findLocalFont } from '../../fonts/localFonts';
import { timelineToFcpxml } from '../../export/fcpxml';
import type { TimelineState } from '../../editor/types';

assert.ok(FONT_TOOL_NAMES.has('search_fonts'));
assert.strictEqual(FONT_TOOL_SCHEMAS[0]!.name, 'search_fonts');

const draft = makeDraft(docFromTimeline({
  fps: 30, width: 1920, height: 1080, items: [], selectedId: null, assets: [],
}));
const ctx: AgentContext = {
  commands: draft.commands,
  getState: draft.getState,
  getDoc: draft.getDoc,
  getCreativeMode: () => null,
  templates: [],
  audio: [],
};

// search_fonts — Google loadable
const inter = await execFontTool('search_fonts', { query: 'inter' }, ctx) as {
  ok: boolean; results: Array<{ family: string; loadable: boolean }>;
};
assert.strictEqual(inter.ok, true);
assert.ok(inter.results.some((r) => r.family === 'Inter' && r.loadable));

// no bundled fonts — findLocalFont returns undefined for all queries
assert.strictEqual(findLocalFont('Smiley Sans'), undefined);
assert.strictEqual(findLocalFont('Noto Sans SC'), undefined);
assert.strictEqual(findLocalFont(''), undefined);
assert.strictEqual(findLocalFont('Comic Sans MS'), undefined);

// ensureLocalFont resolves immediately for non-local fonts (no-op)
await ensureLocalFont('not-a-local-font');
await ensureLocalFont('');
await ensureLocalFont('Smiley Sans');

// loadable check — Google fonts pass, unknown fonts fail
assert.strictEqual(isLoadableFontFamily('Inter'), true);
assert.strictEqual(isLoadableFontFamily(''), true);
assert.strictEqual(isLoadableFontFamily('Comic Sans MS'), false);
assert.strictEqual(isLoadableFontFamily('system-ui, sans-serif'), true);

// Gate: clean timeline passes
const cleanState = draft.getState();
assert.strictEqual(fontFallbackGate(cleanState, false), null);

// Gate: MG with unsupported font blocks without confirm
const blockedState: TimelineState = {
  ...cleanState,
  items: [{
    id: 'mg1',
    track: 'V1',
    startFrame: 0,
    durationInFrames: 90,
    name: 'Title',
    kind: 'motion-graphic',
    props: { fontFamily: 'Comic Sans MS', title: '' },
  }],
};
const refs = collectReferencedFonts(blockedState);
assert.ok(refs.includes('Comic Sans MS'));
const bad = findUnsupportedFonts(blockedState);
assert.deepStrictEqual(bad.unsupported, ['Comic Sans MS']);

const gate = fontFallbackGate(blockedState, false);
assert.ok(gate);
assert.strictEqual(gate!.error, 'unsupported_fonts');
assert.ok((gate!.unsupportedFonts as string[]).includes('Comic Sans MS'));

// confirm bypasses
assert.strictEqual(fontFallbackGate(blockedState, true), null);

// loadable MG font does not gate
const okState: TimelineState = {
  ...cleanState,
  items: [{
    id: 'mg2',
    track: 'V1',
    startFrame: 0,
    durationInFrames: 90,
    name: 'Title',
    kind: 'motion-graphic',
    props: { fontFamily: 'Playfair Display' },
    code: `const s = { fontFamily: 'Inter' };`,
  }],
};
assert.strictEqual(fontFallbackGate(okState, false), null);
assert.ok(collectReferencedFonts(okState).includes('Playfair Display'));
assert.ok(collectReferencedFonts(okState).includes('Inter'));

// nleFormat resolve vs premiere
const xmlPrem = timelineToFcpxml(cleanState, { nleFormat: 'fcp_xml' });
const xmlRes = timelineToFcpxml(cleanState, { nleFormat: 'fcp_xml_resolve' });
assert.ok(xmlPrem.includes('Lazynext Export'));
assert.ok(!xmlPrem.includes('colorSpace='));
assert.ok(xmlRes.includes('Lazynext Export (Resolve)'));
assert.ok(xmlRes.includes('colorSpace="1-1-1 (Rec. 709)"'));

console.log('font-tools.check: ok');
