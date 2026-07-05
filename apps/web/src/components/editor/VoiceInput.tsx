/**
 * Voice Input component — captures microphone audio via MediaRecorder,
 * transcribes it via Whisper worker, and injects text into the AI Copilot prompt.
 *
 * Graceful degradation: falls back to browser SpeechRecognition API
 * if Whisper worker is not initialized.
 *
 * @module VoiceInput
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { TranscriptionLanguage } from "@/transcription/types";

interface VoiceInputProps {
	/** Called when transcription is complete with the recognized text */
	onTranscription: (text: string) => void;
	/** Currently selected language for transcription */
	language?: string;
}

export function VoiceInput({
	onTranscription,
	language = "en",
}: VoiceInputProps) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const chunksRef = useRef<Blob[]>([]);

	const startRecording = useCallback(async () => {
		try {
			setError(null);
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: 16000,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});

			const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
				? "audio/webm;codecs=opus"
				: "audio/webm";

			const recorder = new MediaRecorder(stream, { mimeType });
			chunksRef.current = [];

			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunksRef.current.push(e.data);
				}
			};

			recorder.onstop = () => {
				stream.getTracks().forEach((t) => t.stop());
				const blob = new Blob(chunksRef.current, { type: mimeType });
				void processAudio(blob);
			};

			recorder.start();
			mediaRecorderRef.current = recorder;
			setIsRecording(true);
		} catch {
			setError(
				"Microphone access denied. Please allow microphone permissions.",
			);
		}
	}, []);

	const stopRecording = useCallback(() => {
		mediaRecorderRef.current?.stop();
		setIsRecording(false);
	}, []);

	const processAudio = async (blob: Blob) => {
		setIsProcessing(true);
		setError(null);

		try {
			// Try Whisper worker transcription first
			const text = await tryWhisperTranscription(blob, language);
			if (text) {
				onTranscription(text);
				return;
			}

			// Fallback: try browser SpeechRecognition API
			const webSpeechText = await tryWebSpeechTranscription(blob);
			if (webSpeechText) {
				onTranscription(webSpeechText);
				return;
			}

			setError(
				"Transcription failed. Please type your prompt manually.",
			);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Transcription error",
			);
		} finally {
			setIsProcessing(false);
		}
	};

	const tryWhisperTranscription = async (
		blob: Blob,
		lang: string,
	): Promise<string | null> => {
		try {
			// Decode audio blob to Float32Array using AudioContext
			const arrayBuffer = await blob.arrayBuffer();
			const audioCtx = new AudioContext({ sampleRate: 16000 });
			const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
			audioCtx.close();

			const floatData = audioBuffer.getChannelData(0);

			// Dynamically import the transcription service
			const { transcriptionService } = await import(
				"@/services/transcription/service"
			);
			const result = await transcriptionService.transcribe({
				audioData: floatData,
				language: lang as TranscriptionLanguage,
			});

			return result.text?.trim() || null;
		} catch {
			return null;
		}
	};

	const tryWebSpeechTranscription = async (
		blob: Blob,
	): Promise<string | null> => {
		// Browser SpeechRecognition only works with live streams,
		// so for blob input we use a different approach: play the
		// audio back and capture with SpeechRecognition.
		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;

		if (!SpeechRecognition) {
			return null; // Not supported in this browser
		}

		return new Promise((resolve) => {
			const recognition = new SpeechRecognition();
			recognition.continuous = true;
			recognition.interimResults = false;
			recognition.lang = language;

			let fullTranscript = "";
			let timeoutId: ReturnType<typeof setTimeout>;

			recognition.onresult = (event: any) => {
				for (let i = event.resultIndex; i < event.results.length; i++) {
					if (event.results[i].isFinal) {
						fullTranscript += event.results[i][0].transcript + " ";
					}
				}
			};

			recognition.onend = () => {
				clearTimeout(timeoutId);
				resolve(fullTranscript.trim() || null);
			};

			recognition.onerror = () => {
				clearTimeout(timeoutId);
				resolve(null);
			};

			// Play the recorded audio to feed the SpeechRecognition API
			const url = URL.createObjectURL(blob);
			const audio = new Audio(url);
			audio.play().catch(() => {
				clearTimeout(timeoutId);
				resolve(null);
			});

			recognition.start();

			// Auto-stop after audio duration + buffer
			timeoutId = setTimeout(() => {
				recognition.stop();
				audio.pause();
				URL.revokeObjectURL(url);
			}, 30000);
		});
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={isRecording ? stopRecording : startRecording}
				disabled={isProcessing}
				className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
					isRecording
						? "bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse"
						: "bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400 hover:text-black border border-cyan-400/20"
				} disabled:opacity-50`}
				title={
					isRecording
						? "Stop recording"
						: isProcessing
							? "Processing audio..."
							: "Start voice input"
				}
			>
				{isProcessing ? (
					<Loader2 className="w-5 h-5 animate-spin" />
				) : isRecording ? (
					<MicOff className="w-5 h-5" />
				) : (
					<Mic className="w-5 h-5" />
				)}
			</button>
			{error && (
				<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-lg border border-red-500/20 whitespace-nowrap">
					{error}
				</div>
			)}
		</div>
	);
}
