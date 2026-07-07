/**
 * TypeScript declarations for the soundtouchjs library.
 * Provides Web Audio API-based real-time pitch shifting and time
 * stretching for Lazynext's audio retime feature.
 *
 * @module types/soundtouchjs
 */
declare module "soundtouchjs" {
	export class PitchShifter {
		constructor(
			context: BaseAudioContext,
			buffer: AudioBuffer,
			bufferSize: number,
			onEnd?: () => void,
		);
		tempo: number;
		pitch: number;
		connect(destination: AudioNode): void;
		off(): void;
	}
}
