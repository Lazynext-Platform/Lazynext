// Runnable check: `npx tsx src/components/chat/message-groups.check.ts`.
// groupMessages toolrow(≥GROUP_MIN),;verify/threshold//index。
import assert from 'node:assert/strict';
import type { DisplayMessage } from '../../agent/agent-session';
import { groupMessages, GROUP_MIN } from './message-groups';

const tool = (name: string, id = ''): DisplayMessage => ({ role: 'tool', text: '', tool: { name, args: { id }, result: { ok: true } } });
const txt = (t: string): DisplayMessage => ({ role: 'assistant', text: t });

// 20× edit_gap tool → toolgroup,frontbackrow
const msgs: DisplayMessage[] = [
  txt('start'),
  ...Array.from({ length: 20 }, (_, i) => tool('edit_gap', 'g' + i)),
  tool('read_timeline'),
  txt(''),
];
const items = groupMessages(msgs);
assert.deepStrictEqual(items.map((it) => it.kind), ['single', 'toolgroup', 'single', 'single'], '20 edit_gap 1 ,/toolrow');
const grp = items[1];
assert.ok(grp.kind === 'toolgroup');
assert.strictEqual(grp.kind === 'toolgroup' && grp.name, 'edit_gap');
assert.strictEqual(grp.kind === 'toolgroup' && grp.items.length, 20, 'all 20');
assert.strictEqual(grp.kind === 'toolgroup' && grp.items[0].index, 1, 'inner message index( key/feedback)');
assert.strictEqual(grp.kind === 'toolgroup' && grp.items[19].index, 20);

// threshold:GROUP_MIN-1 (row),GROUP_MIN
const below = groupMessages(Array.from({ length: GROUP_MIN - 1 }, () => tool('search_templates')));
assert.ok(below.every((it) => it.kind === 'single'), `${GROUP_MIN}`);
const at = groupMessages(Array.from({ length: GROUP_MIN }, () => tool('search_templates')));
assert.deepStrictEqual(at.map((it) => it.kind), ['toolgroup'], `full ${GROUP_MIN}`);

// differenttool()
const distinct = groupMessages([tool('clean_script'), tool('read_timeline'), tool('manage_timelines')]);
assert.ok(distinct.every((it) => it.kind === 'single'), 'differenttoolrow,');

// tool →
const split = groupMessages([...Array.from({ length: 4 }, () => tool('edit_gap')), tool('read_timeline'), ...Array.from({ length: 3 }, () => tool('edit_gap'))]);
assert.deepStrictEqual(split.map((it) => it.kind), ['toolgroup', 'single', 'toolgroup'], '');

console.log('message-groups.check: ok (/threshold/index//)');
