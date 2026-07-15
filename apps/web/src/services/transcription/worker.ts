/** @module Transcription web worker routing to Modal Whisper API */
import type { TranscriptionSegment } from "@/transcription/types";

export type WorkerMessage =
	| { type: "init"; modelId: string }
	| { type: "transcribe"; audio: Float32Array; language: string }
	| { type: "cancel" };

export type WorkerResponse =
	| { type: "init-progress"; progress: number }
	| { type: "init-complete" }
	| { type: "init-error"; error: string }
	| { type: "transcribe-progress"; progress: number }
	| {
			type: "transcribe-complete";
			text: string;
			segments: TranscriptionSegment[];
	  }
	| { type: "transcribe-error"; error: string }
	| { type: "cancelled" };

const MODAL_WHISPER_ENDPOINT =
	process.env.NEXT_PUBLIC_MODAL_WHISPER_ENDPOINT ||
	"https://lazynext--whisper.modal.run/transcribe";

let cancelled = false;
let isInitialized = false;

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
	const message = event.data;

	switch (message.type) {
		case "init":
			await handleInit({ modelId: message.modelId });
			break;
		case "transcribe":
			await handleTranscribe({
				audio: message.audio,
				language: message.language,
			});
			break;
		case "cancel":
			cancelled = true;
			self.postMessage({ type: "cancelled" } satisfies WorkerResponse);
			break;
	}
};

async function handleInit({ modelId: _modelId }: { modelId: string }) {
	try {
		// Whisper runs on Modal GPU — web worker just confirms readiness
		self.postMessage({ type: "init-progress", progress: 100 } satisfies WorkerResponse);
		self.postMessage({ type: "init-complete" } satisfies WorkerResponse);
		isInitialized = true;
	} catch (error) {
		self.postMessage({
			type: "init-error",
			error: error instanceof Error ? error.message : "Failed to connect to Modal Whisper",
		} satisfies WorkerResponse);
	}
}

async function handleTranscribe({
	audio,
	language,
}: {
	audio: Float32Array;
	language: string;
}) {
	if (!isInitialized) {
		self.postMessage({
			type: "transcribe-error",
			error: "Worker not initialized",
		} satisfies WorkerResponse);
		return;
	}

	cancelled = false;

	try {
		// Convert Float32Array to base64 WAV for Modal API
		const wavBuffer = float32ToWav(audio, 16000);
		const base64Audio = arrayBufferToBase64(wavBuffer);

		self.postMessage({ type: "transcribe-progress", progress: 30 } satisfies WorkerResponse);

		const response = await fetch(MODAL_WHISPER_ENDPOINT, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				audio_base64: base64Audio,
				language: language === "auto" ? undefined : language,
			}),
		});

		if (cancelled) return;

		if (!response.ok) {
			throw new Error(`Modal Whisper returned ${response.status}`);
		}

		self.postMessage({ type: "transcribe-progress", progress: 70 } satisfies WorkerResponse);

		const data: {
			text: string;
			segments?: Array<{ text: string; start: number; end: number }>;
		} = await response.json();

		const segments: TranscriptionSegment[] = (data.segments || []).map(
			(seg) => ({
				text: seg.text,
				start: seg.start,
				end: seg.end,
			}),
		);

		self.postMessage({
			type: "transcribe-complete",
			text: data.text || "",
			segments,
		} satisfies WorkerResponse);
	} catch (error) {
		if (cancelled) return;
		self.postMessage({
			type: "transcribe-error",
			error: error instanceof Error ? error.message : "Transcription failed",
		} satisfies WorkerResponse);
	}
}

function float32ToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
	const numChannels = 1;
	const bitsPerSample = 16;
	const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
	const blockAlign = (numChannels * bitsPerSample) / 8;
	const dataSize = samples.length * (bitsPerSample / 8);
	const bufferSize = 44 + dataSize;

	const buffer = new ArrayBuffer(bufferSize);
	const view = new DataView(buffer);

	const writeString = (offset: number, str: string) => {
		for (let i = 0; i < str.length; i++) {
			view.setUint8(offset + i, str.charCodeAt(i));
		}
	};

	writeString(0, "RIFF");
	view.setUint32(4, bufferSize - 8, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitsPerSample, true);
	writeString(36, "data");
	view.setUint32(40, dataSize, true);

	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const sample = Math.max(-1, Math.min(1, samples[i]));
		const intSample = sample < 0 ? sample * 32768 : sample * 32767;
		view.setInt16(offset, intSample, true);
		offset += 2;
	}

	return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}
