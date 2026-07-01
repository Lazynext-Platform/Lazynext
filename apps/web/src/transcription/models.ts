/**
 * @module transcription/models
 * @description Available Whisper transcription models and their
 *   HuggingFace ONNX identifiers.
 */

import type { TranscriptionModel, TranscriptionModelId } from "./types";

/** All available transcription models ordered by complexity. */
export const TRANSCRIPTION_MODELS: TranscriptionModel[] = [
	{
		id: "whisper-tiny",
		name: "Tiny",
		huggingFaceId: "onnx-community/whisper-tiny",
		description: "Fastest, lower accuracy",
	},
	{
		id: "whisper-small",
		name: "Small",
		huggingFaceId: "onnx-community/whisper-small",
		description: "Good balance of speed and accuracy",
	},
	{
		id: "whisper-medium",
		name: "Medium",
		huggingFaceId: "onnx-community/whisper-medium",
		description: "Higher accuracy, slower",
	},
	{
		id: "whisper-large-v3-turbo",
		name: "Large v3 Turbo",
		huggingFaceId: "onnx-community/whisper-large-v3-turbo",
		description: "Best accuracy, requires WebGPU for good performance",
	},
];

/** The default transcription model used when none is selected. */
export const DEFAULT_TRANSCRIPTION_MODEL: TranscriptionModelId =
	"whisper-small";
