// Runnable contract check: `npx tsx src/audio/loudness.check.ts`
// function(DOM-free);analyzeClipLoudness dependency fetch/OfflineAudioContext,
// node environmentbottom,。
import assert from 'node:assert';
import { integratedLoudnessFromSamples, gainForTarget } from './loudness';

const SAMPLE_RATE = 48000;

function sine(seconds: number, amplitude: number): Float32Array {
  const n = Math.round(seconds * SAMPLE_RATE);
  const out = new Float32Array(n);
  const freq = 1000; // 1kHz test,period,none
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  return out;
}

// full 1kHz :=0.5, LUFS = -0.691 + 10*log10(0.5) ≈ -3.70(0dB ,
// full 0——fullvaluelow 3dB)。
const fullScale = integratedLoudnessFromSamples(sine(1, 1), SAMPLE_RATE);
assert.ok(fullScale > -6 && fullScale < 0, `full-scale sine should read near 0 dB-ish, got ${fullScale}`);

// ×0.1(low 20dB)→ ×0.01 → fulllow 20 LUFS
const quieter = integratedLoudnessFromSamples(sine(1, 0.1), SAMPLE_RATE);
const delta = fullScale - quieter;
assert.ok(Math.abs(delta - 20) < 0.5, `20dB quieter signal should measure ~20 LUFS lower, got delta=${delta}`);

// mute buffer NaN/Infinity(guard log10(0))
const silent = integratedLoudnessFromSamples(new Float32Array(SAMPLE_RATE), SAMPLE_RATE);
assert.ok(Number.isFinite(silent), `silent buffer must not be NaN/Infinity, got ${silent}`);

// emptyarray
const empty = integratedLoudnessFromSamples(new Float32Array(0), SAMPLE_RATE);
assert.ok(Number.isFinite(empty), `empty buffer must not be NaN/Infinity, got ${empty}`);

// gainForTarget: -24 → -14 needs +10dB,linear = 10^(10/20) ≈ 3.1623
const gain = gainForTarget(-24, -14);
assert.ok(Math.abs(gain - 3.1623) < 0.01, `gain should be ~3.1623, got ${gain}`);

// valuemustrangeinner,mute
assert.ok(gainForTarget(-60, 0) <= 8, 'gain must clamp to the max');
assert.ok(gainForTarget(0, -60) >= 0.05, 'gain must clamp to the min');

// input(NaN/Infinity)must not
assert.ok(Number.isFinite(gainForTarget(NaN, -14)), 'gain must stay finite for NaN current');
assert.ok(Number.isFinite(gainForTarget(-14, Infinity)), 'gain must stay finite for Infinite target');

console.log('loudness.check: ok');
