/** @module Waveform cache service for generating and caching audio waveform previews */
"use client";

import { createAudioContext } from "@/media/audio";
import {
	buildSourceWaveformSummary,
	type SourceWaveformSummary,
} from "@/media/waveform-summary";

interface GetSourceWaveformSummaryArgs {
	/** Unique key identifying the audio source. */
	sourceKey: string;
	/** Optional decoded audio buffer. */
	audioBuffer?: AudioBuffer;
	/** Optional source file to decode. */
	sourceFile?: File;
	/** Optional URL to fetch the audio from. */
	audioUrl?: string;
}

/** Class representing WaveformCache. */
export class WaveformCache {
	private summaries = new Map<string, Promise<SourceWaveformSummary>>();

	getSourceSummary({
		sourceKey,
		audioBuffer,
		sourceFile,
		audioUrl,
	}: GetSourceWaveformSummaryArgs): Promise<SourceWaveformSummary> {
		const existing = this.summaries.get(sourceKey);
		if (existing) {
			return existing;
		}

		const promise = this.buildSummary({
			sourceKey,
			audioBuffer,
			sourceFile,
			audioUrl,
		}).catch((error) => {
			this.summaries.delete(sourceKey);
			throw error;
		});

		this.summaries.set(sourceKey, promise);
		return promise;
	}

	clearSource({ sourceKey }: { sourceKey: string }): void {
		this.summaries.delete(sourceKey);
	}

	clearAll(): void {
		this.summaries.clear();
	}

	private async buildSummary({
		sourceKey,
		audioBuffer,
		sourceFile,
		audioUrl,
	}: GetSourceWaveformSummaryArgs): Promise<SourceWaveformSummary> {
		if (audioBuffer) {
			return buildSourceWaveformSummary({ sourceKey, buffer: audioBuffer });
		}

		let arrayBuffer: ArrayBuffer | null = null;
		if (sourceFile) {
			arrayBuffer = await sourceFile.arrayBuffer();
		} else if (audioUrl) {
			const response = await fetch(audioUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch waveform source: ${response.status}`);
			}
			arrayBuffer = await response.arrayBuffer();
		}

		if (!arrayBuffer) {
			throw new Error(`No waveform source available for ${sourceKey}`);
		}

		const audioContext = createAudioContext();
		try {
			const buffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
			return buildSourceWaveformSummary({ sourceKey, buffer });
		} finally {
			void audioContext.close();
		}
	}
}

/** Utility representing waveformCache. */
export const waveformCache = new WaveformCache();
