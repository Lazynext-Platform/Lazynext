/** @module __tests__/gpu-renderer Test suite for GPU renderer */
import { describe, test, expect, mock, beforeEach } from "bun:test";

// Return a plain object (canvas-substitute) from the WASM mock so that
// tests don't depend on OffscreenCanvas being available in the Bun runner.
const mockCanvas = { width: 128, height: 72 };

const wasmApplyEffect = mock(() => mockCanvas);
const wasmApplyMaskFeather = mock(() => mockCanvas);

mock.module("lazynext-wasm", () => ({
	applyEffectPasses: wasmApplyEffect,
	applyMaskFeather: wasmApplyMaskFeather,
	initializeGpu: () => {},
	getCompositorCanvas: () => mockCanvas,
	initCompositor: () => {},
	renderFrame: () => {},
	uploadTexture: () => {},
	releaseTexture: () => {},
	resizeCompositor: () => {},
	getLastFrameProfile: () => [],
}));

import {
	gpuRenderer,
	initializeGpuRenderer,
	isGpuAvailable,
} from "@/services/renderer/gpu-renderer";

describe("gpu-renderer (WASM bridge)", () => {
	beforeEach(async () => {
		await initializeGpuRenderer();
	});

	test("applyEffect delegates to WASM when gpuAvailable", () => {
		const source = new OffscreenCanvas(128, 72);
		const callsBefore = wasmApplyEffect.mock.calls.length;
		gpuRenderer.applyEffect({
			source,
			width: 128,
			height: 72,
			passes: [{ shader: "screen", uniforms: {} }],
		});
		expect(wasmApplyEffect.mock.calls.length).toBe(callsBefore + 1);
	});

	test("applyEffect returns source when passes are empty", () => {
		const source = new OffscreenCanvas(128, 72);
		const callsBefore = wasmApplyEffect.mock.calls.length;
		const result = gpuRenderer.applyEffect({
			source,
			width: 128,
			height: 72,
			passes: [],
		});
		expect(result).toBe(source);
		expect(wasmApplyEffect.mock.calls.length).toBe(callsBefore);
	});

	test("applyMaskFeather delegates to WASM when gpuAvailable", () => {
		const mask = new OffscreenCanvas(128, 72);
		const callsBefore = wasmApplyMaskFeather.mock.calls.length;
		gpuRenderer.applyMaskFeather({
			maskCanvas: mask,
			width: 128,
			height: 72,
			feather: 10,
		});
		expect(wasmApplyMaskFeather.mock.calls.length).toBe(callsBefore + 1);
	});

	test("isGpuAvailable returns true after initialisation", () => {
		expect(isGpuAvailable()).toBe(true);
	});

	test("initializeGpuRenderer is idempotent", async () => {
		await initializeGpuRenderer();
		await initializeGpuRenderer();
		expect(isGpuAvailable()).toBe(true);
	});
});
