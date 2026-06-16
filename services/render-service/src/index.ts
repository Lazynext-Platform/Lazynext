import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

interface RenderJob {
	id: string;
	projectId: string;
	status: "queued" | "rendering" | "completed" | "failed";
	progress: number;
	format: string; // 'mp4', 'dcp', 'aaf'
	createdAt: string;
}

const renderQueue: Map<string, RenderJob> = new Map();

app.post("/api/v1/jobs", (req, res) => {
	const { projectId, format = "mp4" } = req.body;

	if (!projectId) {
		return res.status(400).json({ error: "Missing projectId" });
	}

	const jobId = uuidv4();
	const job: RenderJob = {
		id: jobId,
		projectId,
		status: "queued",
		progress: 0,
		format,
		createdAt: new Date().toISOString(),
	};

	renderQueue.set(jobId, job);

	// Simulate Render Farm FFMPEG Execution
	console.log(
		`[Render Farm] Queued job ${jobId} for project ${projectId} (Format: ${format})`,
	);

	setTimeout(() => processJob(jobId), 2000);

	res.status(202).json({ success: true, jobId });
});

app.get("/api/v1/jobs/:jobId", (req, res) => {
	const job = renderQueue.get(req.params.jobId);
	if (!job) {
		return res.status(404).json({ error: "Job not found" });
	}
	res.json({ success: true, job });
});

function processJob(jobId: string) {
	const job = renderQueue.get(jobId);
	if (!job) return;

	job.status = "rendering";
	console.log(`[Render Farm] Started rendering job ${jobId}...`);

	const outputDir = path.join(__dirname, "../outputs");
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}
	const outputPath = path.join(outputDir, `${jobId}.${job.format}`);

	// Create a 5-second 1080p video using FFMPEG lavfi (no text filter needed)
	const durationSeconds = 5;
	const ffmpegArgs = [
		"-f", "lavfi",
		"-i", `color=c=0x0a0a0a:s=1920x1080:d=${durationSeconds}:r=24`,
		"-c:v", "libx264",
		"-preset", "ultrafast",
		"-pix_fmt", "yuv420p",
		"-y", // overwrite
		outputPath
	];

	const ffmpeg = spawn("ffmpeg", ffmpegArgs);

	ffmpeg.stderr.on("data", (data) => {
		const output = data.toString();
		console.log(`[FFMPEG] ${output.trim()}`);
		// Parse FFMPEG time output to calculate progress
		const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
		if (timeMatch) {
			const hours = parseInt(timeMatch[1], 10);
			const minutes = parseInt(timeMatch[2], 10);
			const seconds = parseFloat(timeMatch[3]);
			const totalSeconds = hours * 3600 + minutes * 60 + seconds;
			
			let progress = Math.floor((totalSeconds / durationSeconds) * 100);
			if (progress > 100) progress = 100;
			
			const currentJob = renderQueue.get(jobId);
			if (currentJob) {
				currentJob.progress = progress;
			}
		}
	});

	ffmpeg.on("close", (code) => {
		const currentJob = renderQueue.get(jobId);
		if (!currentJob) return;

		if (code === 0) {
			currentJob.progress = 100;
			currentJob.status = "completed";
			console.log(`[Render Farm] Finished job ${jobId}! Output generated at ${outputPath}`);
		} else {
			currentJob.status = "failed";
			console.error(`[Render Farm] Job ${jobId} failed with exit code ${code}`);
		}
	});
}

// Server-Sent Events (SSE) endpoint for real-time progress streaming
app.get("/api/v1/jobs/:jobId/stream", (req, res) => {
	const job = renderQueue.get(req.params.jobId);
	if (!job) {
		return res.status(404).json({ error: "Job not found" });
	}

	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");

	const sendProgress = () => {
		const currentJob = renderQueue.get(req.params.jobId);
		if (!currentJob) return;

		res.write(`data: ${JSON.stringify(currentJob)}\n\n`);

		if (currentJob.status === "completed" || currentJob.status === "failed") {
			clearInterval(intervalId);
			res.end();
		}
	};

	// Send initial state immediately
	sendProgress();

	// Poll and send updates every 1.5s matching the render speed
	const intervalId = setInterval(sendProgress, 1500);

	req.on("close", () => {
		clearInterval(intervalId);
	});
});

const PORT = process.env.PORT || 8003;

app.listen(PORT, () => {
	console.log(`🎬 Lazynext Render Farm Service running on port ${PORT}`);
	console.log(
		`📡 Accepting FFMPEG / DCP / AAF commands via REST & Server-Sent Events`,
	);
});
