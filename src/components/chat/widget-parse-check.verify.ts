// row：`npx tsx src/components/chat/widget-parse.check.ts`
// widget + formatWidgetAnswer + widget 。
import assert from 'node:assert';
import {
  parseWidgets, formatWidgetAnswer,
  type FormMulti, type FormRichChoice, type FormSingle,
} from './widget-parse';

const REAL_EXAMPLE = `！startbefore，needs： <widget> <form-single id="duration" label="videodurationlarge？" options="60s|1,180s|3,300s|5" allow_other="false"/> <form-single id="ratio" label="video" options="16:9| 16:9,9:16| 9:16,1:1|"/> <form-multi id="content" label="dotinner？（）" options=",table,historybackground"/> <form-visual id="voiceId" label="select：" required="true"> <visual-option value="ruyayichen" name="" media="/voice-samples/doubao-ruyayichen.mp3" aspect-ratio="16:5" summary="/ /"/> <visual-option value="morgan" name="Morgan" media="/voice-samples/x.mp3" summary="..."/> </form-visual> </widget>`;

// ---- + parse ----
const segs = parseWidgets(REAL_EXAMPLE);
assert.strictEqual(segs.length, 2, 'segment 2（ + widget）');
assert.strictEqual(segs[0].type, 'text');
assert.ok(segs[0].type === 'text' && segs[0].text.includes('！startbefore'));
assert.strictEqual(segs[1].type, 'widget');
assert.ok(segs[1].type === 'widget');
const fields = segs[1].type === 'widget' ? segs[1].fields : [];
assert.strictEqual(fields.length, 4, '4');

const [duration, ratio, content, voiceId] = fields as [
  FormSingle,
  FormSingle,
  FormMulti,
  FormRichChoice,
];

assert.strictEqual(duration.kind, 'single');
assert.strictEqual(duration.id, 'duration');
assert.strictEqual(duration.label, 'videodurationlarge？');
assert.strictEqual(duration.allowOther, false);
assert.deepStrictEqual(duration.options, [
  { value: '60s', display: '1' },
  { value: '180s', display: '3' },
  { value: '300s', display: '5' },
]);

assert.strictEqual(ratio.kind, 'single');
assert.strictEqual(ratio.allowOther, false, 'allow_other false');
assert.deepStrictEqual(ratio.options, [
  { value: '16:9', display: '16:9' },
  { value: '9:16', display: '9:16' },
  { value: '1:1', display: '' },
]);

assert.strictEqual(content.kind, 'multi');
assert.deepStrictEqual(content.options, [
  { value: '', display: '' },
  { value: 'table', display: 'table' },
  { value: 'historybackground', display: 'historybackground' },
]);

assert.strictEqual(voiceId.kind, 'visual');
assert.strictEqual(voiceId.required, true);
assert.strictEqual(voiceId.options.length, 2);
assert.deepStrictEqual(voiceId.options[0], {
  value: 'ruyayichen',
  name: '',
  media: '/voice-samples/doubao-ruyayichen.mp3',
  description: '/ /',
  aspectRatio: '16:5',
  submitPrompt: undefined,
});
assert.deepStrictEqual(voiceId.options[1], {
  value: 'morgan',
  name: 'Morgan',
  media: '/voice-samples/x.mp3',
  description: '...',
  aspectRatio: undefined,
  submitPrompt: undefined,
});

// ---- formatWidgetAnswer ----
const answer = formatWidgetAnswer(fields, {
  duration: '180s',
  ratio: '16:9',
  content: ['', 'table'],
  voiceId: 'ruyayichen',
});
assert.strictEqual(
  answer,
  ['- videodurationlarge？：3', '- video： 16:9', '- dotinner？（）：、table', '- select：：'].join('\n'),
);

// ；allow_other
const partial = formatWidgetAnswer(fields, { duration: 'custom' });
assert.strictEqual(partial, '- videodurationlarge？：custom');

// ---- none widget ： ----
const plain = parseWidgets('，table。');
assert.strictEqual(plain.length, 1);
assert.deepStrictEqual(plain[0], { type: 'text', text: '，table。' });

// ---- widget：、（output）----
const malformed = 'front<widget><form-single id="x"/></widget>back';
assert.doesNotThrow(() => parseWidgets(malformed));
const malformedSegs = parseWidgets(malformed);
assert.strictEqual(malformedSegs.length, 2);
assert.deepStrictEqual(malformedSegs[0], { type: 'text', text: 'front' });
assert.deepStrictEqual(malformedSegs[1], { type: 'text', text: 'back' });

// ---- empty widget（none）， ----
const empty = '<widget></widget>';
assert.doesNotThrow(() => parseWidgets(empty));
assert.deepStrictEqual(parseWidgets(empty), []);

console.log('widget-parse.check: ok');
