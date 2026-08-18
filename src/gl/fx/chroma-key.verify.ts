// （chroma-key）。
// import effects.ts —— `.frag?raw` importdependency Vite raw-loader，
// `npx tsx` parse（ .frag JS parse）， fx.check.ts
// manualmirror FX_EFFECTS['builtin:fx-chroma-key'] id/props（ effects.ts ），
// frag source fs validate。
// : npx tsx src/gl/fx/chroma-key.check.ts
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fxUniforms, type FxDef } from './uniforms';

const __dirname = dirname(fileURLToPath(import.meta.url));

// mirror effects.ts 'builtin:fx-chroma-key'
const chromaKey: FxDef = {
  id: 'builtin:fx-chroma-key', name: '/', desc: '', frag: '',
  props: [
    { key: 'keyColor', label: '', kind: 'color', default: [0, 1, 0], uniform: 'u_keyColor' },
    { key: 'similarity', label: '', default: 0.18, min: 0, max: 0.6 },
    { key: 'smoothness', label: '', default: 0.08, min: 0.001, max: 0.4 },
    { key: 'spill', label: '', default: 0.5, min: 0, max: 1 },
  ],
};

// 1) default uniform map：value props u_<key>，color prop uniform
assert.deepStrictEqual(fxUniforms(chromaKey), {
  u_keyColor: [0, 1, 0],
  u_similarity: 0.18,
  u_smoothness: 0.08,
  u_spill: 0.5,
}, 'chroma-key default uniform map');

// 2) override [min,max]（color [0,1]）
assert.deepStrictEqual(
  fxUniforms(chromaKey, { similarity: 99, smoothness: -1, spill: 2, keyColor: [2, -1, 0.5] }),
  { u_keyColor: [1, 0, 0.5], u_similarity: 0.6, u_smoothness: 0.001, u_spill: 1 },
  'override',
);

// 3) frag source： runtime.ts renderFx uniform alignment
const frag = readFileSync(join(__dirname, 'chroma-key.frag'), 'utf8');
assert.ok(frag.includes('#version 300 es'), 'GLSL 300 es');
assert.ok(frag.includes('uniform sampler2D u_input'), 'u_input（renderFx input）');
assert.ok(frag.includes('in vec2 v_texCoord'), 'v_texCoord varying（dot）');
assert.ok(/\bvoid\s+main\s*\(/.test(frag), 'main()');
assert.ok(/\bout\s+vec4\s+fragColor\b/.test(frag), 'out vec4 fragColor');
assert.ok(frag.includes('fragColor ='), 'main fragColor');

// props key uniform （uniform ?? u_<key>）must frag ，
// runtime setUniform location，
for (const p of chromaKey.props) {
  const uniformName = p.uniform ?? `u_${p.key}`;
  assert.ok(frag.includes(uniformName), `frag ${uniformName}（ props.${p.key}）`);
}

console.log('chroma-key.check: ok');
