import type { AgentToolSchema } from '../../tool-schema';

export const RUN_SKILL_SCRIPT_TOOL_NAMES = new Set(['run_skill_script']);

export const RUN_SKILL_SCRIPT_TOOL_SCHEMAS: AgentToolSchema[] = [
 {
 name: 'run_skill_script',
 description: 'Installedbash/sh/node/npm/npx/python3/python/uv/uvx/ffmpeg/ffprobe/mkdir/cp/chmod render.mjscheck-deps.sh 60s 120s 512KB',
 input_schema: {
 type: 'object',
 properties: {
 skill: { type: 'string', description: ' slugload_skill skill ' },
 command: { type: 'string', description: ' bash scripts/check-deps.sh node scripts/render.mjs' },
 timeout: { type: 'number', description: ' 60000 120000' },
 },
 required: ['skill', 'command'],
 },
 },
];
