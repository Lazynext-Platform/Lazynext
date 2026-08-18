// row：`npx tsx src/agent/followup-tools.check.ts`
// ask_followup_questions fields serialize <widget> ， UI parseWidgets parse
// table。verify：buildFollowupWidget → parseWidgets none， execFollowupTool
// __followup 、noneoption、empty fields 。
import assert from 'node:assert';
import { buildFollowupWidget, execFollowupTool, FOLLOWUP_TOOL_NAMES } from './followup-tools';
import { parseWidgets, type FormMulti, type FormSingle, type WidgetField } from '../../components/chat/widget-parse';
import type { AgentContext } from '../context';

const ctx = {} as AgentContext; // followup editstate

// ---- ：single + multi buildFollowupWidget → parseWidgets none ----
const text = buildFollowupWidget(
  [
    { id: 'ratio', label: 'Aspect ratio', type: 'single', options: [{ value: '16:9', display: '16:9' }, { value: '9:16', display: '9:16' }], required: true },
    { id: 'topics', label: 'Topics', type: 'multi', options: [{ value: 'a', display: 'Option A' }, { value: 'b', display: 'Option B' }], allowOther: true },
  ],
  'startfrontneedsconfirm：',
);
const segs = parseWidgets(text);
assert.strictEqual(segs.length, 2, '+ widget');
assert.ok(segs[0].type === 'text' && segs[0].text.includes('startfrontneedsconfirm'), 'prompt front');
assert.ok(segs[1].type === 'widget', 'widget');
const fields = segs[1].type === 'widget' ? segs[1].fields : [];
assert.strictEqual(fields.length, 2, '2');
const [ratio, topics] = fields as [FormSingle, FormMulti];
assert.strictEqual(ratio.kind, 'single');
assert.strictEqual(ratio.id, 'ratio');
assert.strictEqual(ratio.label, 'Aspect ratio');
assert.strictEqual(ratio.required, true, 'required');
assert.deepStrictEqual(ratio.options, [{ value: '16:9', display: '16:9' }, { value: '9:16', display: '9:16' }]);
assert.strictEqual(topics.kind, 'multi');
assert.strictEqual(topics.allowOther, true, 'allow_other');

// ---- noneoption prompt row， widget ----
const freeText = buildFollowupWidget([{ id: 'title', label: 'videotitle', type: 'single', options: [] }], '');
const freeSegs = parseWidgets(freeText);
assert.ok(!freeSegs.some((s) => s.type === 'widget'), 'noneoption widget');
assert.ok(freeSegs.some((s) => s.type === 'text' && s.text.includes('- videotitle')), 'noneoptionrow');

// ---- blend：option + → widget option，front ----
const mixed = buildFollowupWidget(
  [
    { id: 'q1', label: 'option', type: 'single', options: ['x', 'y'] },
    { id: 'q2', label: 'input', type: 'single', options: [] },
  ],
  '',
);
const mixedSegs = parseWidgets(mixed);
const mixedWidget = mixedSegs.find((s) => s.type === 'widget');
assert.ok(mixedWidget && mixedWidget.type === 'widget' && mixedWidget.fields.length === 1, 'option');
assert.ok(mixedSegs.some((s) => s.type === 'text' && s.text.includes('- input')), 'row');

// ---- （//&） esc → decodeEntities none ----
const escaped = buildFollowupWidget([{ id: 'q', label: 'A & B <c> "d"', type: 'single', options: [{ value: 'v', display: 'x & y' }] }], '');
const escFields = (parseWidgets(escaped).find((s) => s.type === 'widget') as { type: 'widget'; fields: WidgetField[] }).fields;
assert.strictEqual(escFields[0].label, 'A & B <c> "d"', 'labelnone');
const escOpt = (escFields[0] as FormSingle).options[0] as { display?: string; value?: string };
assert.strictEqual(escOpt.display ?? escOpt.value, 'x & y', 'optionnone');

// ---- execFollowupTool ：input __followup，empty fields ----
assert.ok(FOLLOWUP_TOOL_NAMES.has('ask_followup_questions'));
const ok = execFollowupTool('ask_followup_questions', { fields: [{ id: 'r', label: 'Ratio', type: 'single', options: ['16:9', '9:16'] }], prompt: '' }, ctx) as { __followup?: string; note?: string };
assert.ok(typeof ok.__followup === 'string' && ok.__followup.includes('<widget>'), '__followup widget');
assert.ok(typeof ok.note === 'string' && ok.note.length > 0, 'note');
const empty = execFollowupTool('ask_followup_questions', { fields: [] }, ctx) as { error?: string };
assert.ok(empty.error, 'empty fields');
const noRenderable = execFollowupTool('ask_followup_questions', { fields: [{ label: 'Choice', type: 'single', options: [] }] }, ctx) as { error?: string };
assert.ok(noRenderable.error, 'no renderable fields');
const badName = execFollowupTool('nope', { fields: [] }, ctx) as { error?: string };
assert.ok(badName.error, 'tool');

console.log('followup-tools.check.ts ✓ (widget / noneoption / / exec )');
