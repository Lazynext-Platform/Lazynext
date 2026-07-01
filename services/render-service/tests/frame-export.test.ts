/** @module tests/frame-export Test suite for frame export pipeline (RGBA → FFMPEG). */

import { expect, test, describe } from "bun:test";
import {
	appendFrame,
	buildRawVideoEncodeArgs,
	codecForFormat,
	createFrameJob,
	deleteFrameJob,
	getFrameJob,
	type ExportFormatId,
	type FrameJobConfig,
} from "../src/frame-export";

function makeConfig(overrides: Partial<FrameJobConfig> = {}): FrameJobConfig {
	return {
		jobId: `test-${Math.random().toString(36).slice(2)}`,
		projectId: "proj-1",
		format: "mp4",
		bitrateKbps: 8000,
		width: 4,
		height: 4,
		framerate: 24,
		totalFrames: 3,
		...overrides,
	};
}

describe("codecForFormat — mirrors rust encoder.rs", () => {
	test("mp4 → libx264 + yuv420p + crf", () => {
		const r = codecForFormat("mp4");
		expect(r.codec).toBe("libx264");
		expect(r.pixFmt).toBe("yuv420p");
		expect(r.extra).toContain("-crf");
	});

	test("prores → prores_ks + yuv422p10le + profile 3", () => {
		const r = codecForFormat("prores");
		expect(r.codec).toBe("prores_ks");
		expect(r.pixFmt).toBe("yuv422p10le");
		expect(r.extra).toEqual(["-profile:v", "3"]);
	});

	test("dcp → jpeg2000 + xyz12le + smpte color", () => {
		const r = codecForFormat("dcp");
		expect(r.codec).toBe("jpeg2000");
		expect(r.pixFmt).toBe("xyz12le");
		expect(r.extra).toContain("smpte431");
	});

	test("aaf → dnxhd + yuv422p", () => {
		const r = codecForFormat("aaf");
		expect(r.codec).toBe("dnxhd");
		expect(r.pixFmt).toBe("yuv422p");
	});

	test("all formats covered", () => {
		const all: ExportFormatId[] = ["mp4", "prores", "dcp", "aaf", "mov"];
		for (const f of all) {
			const r = codecForFormat(f);
			expect(r.codec.length).toBeGreaterThan(0);
			expect(r.pixFmt.length).toBeGreaterThan(0);
		}
	});
});

describe("buildRawVideoEncodeArgs", () => {
	test("rawvideo rgba stdin input + output path last", () => {
		const cfg = makeConfig({ format: "mp4", bitrateKbps: 5000 });
		const args = buildRawVideoEncodeArgs(cfg, "/tmp/out.mp4");
		expect(args[0]).toBe("-y");
		expect(args).toContain("-f");
		expect(args).toContain("rawvideo");
		expect(args).toContain("rgba");
		expect(args).toContain("-"); // stdin
		expect(args).toContain("libx264");
		expect(args).toContain("-b:v");
		expect(args).toContain("5000k");
		expect(args[args.length - 1]).toBe("/tmp/out.mp4");
	});

	test("zero bitrate omits -b:v", () => {
		const cfg = makeConfig({ bitrateKbps: 0 });
		const args = buildRawVideoEncodeArgs(cfg, "/tmp/out.mp4");
		expect(args).not.toContain("-b:v");
	});
});

describe("frame job lifecycle (in-memory)", () => {
	test("appendFrame enforces strict ordering + size", () => {
		const cfg = makeConfig({ width: 2, height: 2, totalFrames: 3 });
		createFrameJob(cfg);
		const frameBytes = 2 * 2 * 4; // 16
		const good = Buffer.alloc(frameBytes);

		// seq 0 ok
		let r = appendFrame(cfg.jobId, 0, good, frameBytes, 0);
		expect(r.ok).toBe(true);

		// seq 2 before 1 → out of order
		r = appendFrame(cfg.jobId, 2, good, frameBytes, 0);
		expect(r.ok).toBe(false);
		expect(r.status).toBe(400);

		// seq 1 ok now
		r = appendFrame(cfg.jobId, 1, good, frameBytes, 0);
		expect(r.ok).toBe(true);

		// wrong size
		r = appendFrame(cfg.jobId, 2, Buffer.alloc(1), frameBytes, 0);
		expect(r.ok).toBe(false);
		expect(r.status).toBe(400);

		// seq 2 ok with correct size
		r = appendFrame(cfg.jobId, 2, good, frameBytes, 0);
		expect(r.ok).toBe(true);

		const job = getFrameJob(cfg.jobId)!;
		expect(job.frames.length).toBe(3);
		expect(job.nextSeq).toBe(3);

		deleteFrameJob(cfg.jobId);
	});

	test("appendFrame returns 503 on backpressure cap", () => {
		const cfg = makeConfig({ width: 2, height: 2, totalFrames: 10 });
		createFrameJob(cfg);
		const frameBytes = 16;
		const good = Buffer.alloc(frameBytes);

		// cap = 1 frame worth → 2nd frame exceeds cap
		appendFrame(cfg.jobId, 0, good, frameBytes, frameBytes);
		const r = appendFrame(cfg.jobId, 1, good, frameBytes, frameBytes);
		expect(r.ok).toBe(false);
		expect(r.status).toBe(503);

		deleteFrameJob(cfg.jobId);
	});

	test("appendFrame 404 for unknown job", () => {
		const r = appendFrame("nope", 0, Buffer.alloc(16), 16, 0);
		expect(r.ok).toBe(false);
		expect(r.status).toBe(404);
	});

	test("createFrameJob sets awaiting_frames; delete removes", () => {
		const cfg = makeConfig();
		const job = createFrameJob(cfg);
		expect(job.status).toBe("awaiting_frames");
		expect(getFrameJob(cfg.jobId)).toBeDefined();
		expect(deleteFrameJob(cfg.jobId)).toBe(true);
		expect(getFrameJob(cfg.jobId)).toBeUndefined();
	});
});
