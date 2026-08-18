// row:`npx tsx src/agent/tools/skill-tools.check.ts`
// manage_skill current / activate(mode dump ):current empty/value、
// activate validate id + ctx.setCreativeMode + empty、 setter 。
// customskill CRUD IDB(browser),node bottom refresh ——innerskillverify。
import assert from 'node:assert';
import { execSkillTool, SKILL_TOOL_NAMES, SKILL_TOOL_SCHEMAS } from './skill-tools';
import { CREATIVE_SKILLS } from '../skills/skills-catalog';
import type { AgentContext } from '../context';

assert.ok(SKILL_TOOL_NAMES.has('manage_skill'));
const actions = (SKILL_TOOL_SCHEMAS[0].input_schema as unknown as { properties: { action: { enum: string[] } } }).properties.action.enum;
for (const a of ['list', 'get', 'current', 'activate', 'create', 'update', 'delete']) {
  assert.ok(actions.includes(a), `schema action ${a}`);
}

// :mode
let mode: string | null = null;
const ctx = {
  getCreativeMode: () => mode,
  setCreativeMode: (id: string | null) => { mode = id; },
} as unknown as AgentContext;

const builtinId = CREATIVE_SKILLS[0]?.id ?? null;

// ---- current: → active:null ----
{
  const r = await execSkillTool('manage_skill', { action: 'current' }, ctx) as { active: unknown; note?: string };
  assert.strictEqual(r.active, null, 'mode active:null');
  assert.ok(r.note?.includes(''), '');
}

// ---- activate innerskill → + ;current ----
// (node bottom getPluginSkill Vite `?raw`,innerfile → CREATIVE_SKILLS is empty,
// inneractivate,validateemptybottom。)
if (builtinId) {
  const r = await execSkillTool('manage_skill', { action: 'activate', skillId: builtinId }, ctx) as {
    ok?: boolean; active?: { id: string; builtin: boolean }; note?: string;
  };
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.active?.id, builtinId);
  assert.strictEqual(r.active?.builtin, true, 'innerskill builtin');
  assert.ok(r.note?.includes('bottom'), '(system runAgent )');
  assert.strictEqual(mode, builtinId, 'ctx.setCreativeMode');

  const cur = await execSkillTool('manage_skill', { action: 'current' }, ctx) as { active: { id: string } };
  assert.strictEqual(cur.active.id, builtinId, 'current activatemode');

  const unknown = await execSkillTool('manage_skill', { action: 'activate', skillId: 'skill_nope' }, ctx) as { error?: string };
  assert.ok(unknown.error?.includes('no skill'), 'id');
  assert.strictEqual(mode, builtinId, 'currentmode');
}

// ---- activate empty → ----
{
  const r = await execSkillTool('manage_skill', { action: 'activate', skillId: '' }, ctx) as { ok?: boolean; active?: unknown };
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.active, null);
  assert.strictEqual(mode, null, 'emptymode');
}

// ---- setter(old check ctx)→ ----
{
  const bare = { getCreativeMode: () => null } as unknown as AgentContext;
  const r = await execSkillTool('manage_skill', { action: 'activate', skillId: builtinId ?? 'skill_any' }, bare) as { error?: string };
  assert.ok(r.error, 'none setCreativeMode');
}

console.log('skill-tools.check: ALL PASSED');
